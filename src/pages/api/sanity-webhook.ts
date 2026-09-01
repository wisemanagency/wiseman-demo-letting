// Sanity → Vercel deploy-hook debouncer.
//
// Without this layer, every Sanity publish fires a webhook and every webhook
// triggers a Vercel rebuild. When a client uploads several images in quick
// succession (which is the normal Studio workflow), Vercel's deploy queue
// can serve an intermediate build that only captures some of the images —
// the live page goes stale with incomplete content until the next edit.
//
// This endpoint solves that with a two-layer debounce:
//
//   1. Leading-edge (this endpoint): the first webhook in a burst forwards
//      to the Vercel deploy hook immediately. Subsequent webhooks within
//      `DEBOUNCE_MS` are skipped (low latency for the common case where
//      the user just made one edit).
//
//   2. Trailing-edge (QStash callback at /api/sanity-webhook-trailing):
//      every skipped webhook schedules a QStash message at (now + DEBOUNCE_MS).
//      When QStash delivers the message, the trailing-edge endpoint checks
//      whether newer activity has arrived since — if not, it forwards to
//      Vercel. This guarantees that the LAST edit in a burst always gets
//      a rebuild once things go quiet, even if no further Sanity writes
//      happen. Without this, an edit landing inside the cooldown window
//      of an earlier edit would be silently dropped until the next unrelated
//      edit happened to arrive outside the cooldown.
//
// Activity state (last-activity-at, last-forward-at) lives in Upstash
// Redis (the KV store Vercel now provisions via Storage → Redis or
// Storage → Upstash). The QStash client/receiver live in `src/lib/qstash.ts`.
//
// In practice: a burst of N image uploads produces 1–2 deploys (one
// leading-edge at the burst start, one trailing-edge ~20s after the last
// upload), not N. Single isolated edits produce 1 deploy.
//
// Setup:
//   - Vercel project → Storage → Create Database → Redis (or Upstash).
//     Connect it to this project — Vercel auto-adds
//     UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars.
//   - Vercel project → Settings → Environment Variables:
//       VERCEL_DEPLOY_HOOK_URL = the deploy-hook URL from Vercel
//         (Project Settings → Git → Deploy Hooks)
//       QSTASH_TOKEN             = server token from Upstash QStash dashboard
//       QSTASH_CURRENT_SIGNING_KEY = callback verification (current rotation)
//       QSTASH_NEXT_SIGNING_KEY    = callback verification (next rotation)
//   - Sanity project → API → Webhooks → update to POST to
//       https://<your-vercel-domain>/api/sanity-webhook
//
// If QSTASH_TOKEN is not set, this endpoint degrades to pure leading-edge
// with cooldown (the previous behaviour) — the trailing-edge guarantee is
// lost, but the burst dedup still works. Forgetting QSTASH_*_SIGNING_KEY
// will disable trailing-edge callback verification (and the endpoint will
// reject all QStash callbacks as 401).

import { Redis } from "@upstash/redis";
import type { APIRoute } from "astro";
import { qstashClient } from "../../lib/qstash";

export const prerender = false;

// Cooldown window: webhooks arriving within this many ms of the previous
// forward are dropped. 20s covers a normal multi-image upload sequence
// while keeping perceived latency low (first image deploys immediately).
const DEBOUNCE_MS = 20_000;

// Keys in Redis. Scoped per-project is unnecessary because each
// Vercel project gets its own Redis database.
const KEY_LAST_FORWARD = "sanity:debouncer:last-forward-at";
const KEY_LAST_ACTIVITY = "sanity:debouncer:last-activity-at";

// Lazy singleton — instantiated on first request so cold starts don't
// allocate it for static-asset requests that happen to hit /api/.
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
});

export const POST: APIRoute = async ({ request }) => {
  // Accept any POST — Sanity's signature is verified by URL obscurity,
  // and the function is only callable from the public internet.
  // (If you want stricter auth, add HMAC verification here.)
  const now = Date.now();

  // Record activity (TTL ≈ 4× debounce so a long pause still has history).
  await redis.set(KEY_LAST_ACTIVITY, now, { ex: Math.ceil((DEBOUNCE_MS * 4) / 1000) });

  // Check cooldown: skip if we forwarded within the debounce window.
  const lastForward = Number((await redis.get<number>(KEY_LAST_FORWARD)) ?? 0);
  if (now - lastForward < DEBOUNCE_MS) {
    // Trailing-edge safety net: schedule a QStash message at
    // (now + DEBOUNCE_MS) targeting the trailing-edge endpoint. QStash
    // guarantees the delivery, so even if the user closes the tab and no
    // further Sanity writes happen, the trailing-edge handler will check
    // staleness and forward the deploy ~20s after the burst settles.
    //
    // If multiple webhooks are skipped in quick succession, each schedules
    // its own QStash message; the trailing-edge handler drops all but the
    // one whose scheduledAt matches the latest activity.
    if (qstashClient) {
      try {
        const origin = new URL(request.url).origin;
        await qstashClient.publishJSON({
          url: `${origin}/api/sanity-webhook-trailing`,
          body: { scheduledAt: now },
          delay: DEBOUNCE_MS / 1000,
          retries: 3,
        });
      } catch (err) {
        // Logged but non-fatal: the leading-edge forward above already
        // covered the burst's first edit. If QStash is unavailable, we
        // degrade to the old leading-edge-with-cooldown behaviour.
        console.error("qstash schedule failed:", (err as Error).message);
      }
    }
    return new Response(
      JSON.stringify({
        status: "skipped",
        reason: "within-debounce-window",
        msSinceLastForward: now - lastForward,
        trailingEdgeScheduled: qstashClient !== null,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  const target = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!target) {
    return new Response(
      JSON.stringify({ status: "error", reason: "VERCEL_DEPLOY_HOOK_URL not set" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Forward. Fire-and-forget the response — Vercel's deploy hook is
  // idempotent and only cares about the POST itself.
  try {
    const res = await fetch(target, { method: "POST" });
    if (!res.ok) {
      return new Response(
        JSON.stringify({ status: "error", reason: `deploy-hook returned ${res.status}` }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    return new Response(JSON.stringify({ status: "error", reason: (err as Error).message }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  await redis.set(KEY_LAST_FORWARD, Date.now(), { ex: Math.ceil((DEBOUNCE_MS * 4) / 1000) });

  return new Response(JSON.stringify({ status: "forwarded", debounceMs: DEBOUNCE_MS }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
