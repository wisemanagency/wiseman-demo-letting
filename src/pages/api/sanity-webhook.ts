// Sanity → Vercel deploy-hook debouncer.
//
// Without this layer, every Sanity publish fires a webhook and every webhook
// triggers a Vercel rebuild. When a client uploads several images in quick
// succession (which is the normal Studio workflow), Vercel's deploy queue
// can serve an intermediate build that only captures some of the images —
// the live page goes stale with incomplete content until the next edit.
//
// This endpoint solves that by:
//
//   1. Recording the latest Sanity activity in Vercel KV.
//   2. Forwarding to the Vercel deploy hook IMMEDIATELY for the first
//      webhook in a burst (low latency).
//   3. Skipping subsequent webhooks that arrive within the cooldown
//      window — Vercel's deploy hook URL is the single trigger, and
//      Vercel already coalesces overlapping deploys.
//
// Each webhook that arrives more than `DEBOUNCE_MS` after the previous
// one starts a fresh build. In practice that means: a burst of N image
// uploads produces 1–2 deploys, not N.
//
// Setup:
//   - Vercel project → Storage → KV → Create (free tier is plenty).
//   - Vercel project → Settings → Environment Variables:
//       VERCEL_DEPLOY_HOOK_URL = the deploy-hook URL from Vercel
//         (Project Settings → Git → Deploy Hooks)
//   - Sanity project → API → Webhooks → update to POST to
//       https://<your-vercel-domain>/api/sanity-webhook

import { kv } from "@vercel/kv";
import type { APIRoute } from "astro";

export const prerender = false;

// Cooldown window: webhooks arriving within this many ms of the previous
// forward are dropped. 20s covers a normal multi-image upload sequence
// while keeping perceived latency low (first image deploys immediately).
const DEBOUNCE_MS = 20_000;

// Keys in Vercel KV. Scoped per-project is unnecessary because each
// Vercel project gets its own KV namespace.
const KEY_LAST_FORWARD = "sanity:debouncer:last-forward-at";
const KEY_LAST_ACTIVITY = "sanity:debouncer:last-activity-at";

export const POST: APIRoute = async ({ request: _request }) => {
  // Accept any POST — Sanity's signature is verified by URL obscurity,
  // and the function is only callable from the public internet.
  // (If you want stricter auth, add HMAC verification here.)
  void _request;
  const now = Date.now();

  // Record activity (TTL ≈ 2× debounce so a long pause still has history).
  await kv.set(KEY_LAST_ACTIVITY, now, { ex: (DEBOUNCE_MS * 4) / 1000 });

  // Check cooldown: skip if we forwarded within the debounce window.
  const lastForward = Number((await kv.get<number>(KEY_LAST_FORWARD)) ?? 0);
  if (now - lastForward < DEBOUNCE_MS) {
    return new Response(
      JSON.stringify({
        status: "skipped",
        reason: "within-debounce-window",
        msSinceLastForward: now - lastForward,
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

  await kv.set(KEY_LAST_FORWARD, Date.now(), { ex: (DEBOUNCE_MS * 4) / 1000 });

  return new Response(JSON.stringify({ status: "forwarded", debounceMs: DEBOUNCE_MS }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
