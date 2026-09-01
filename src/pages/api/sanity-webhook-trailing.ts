// Trailing-edge debouncer endpoint — invoked by Upstash QStash.
//
// The leading-edge handler at /api/sanity-webhook schedules a QStash
// message at (skippedWebhookTime + DEBOUNCE_MS) for every webhook it
// drops inside the cooldown window. When QStash delivers the message
// here, this endpoint checks whether the burst has continued past the
// scheduled time — if a newer webhook arrived after this one was
// scheduled, that newer webhook will have scheduled its own trailing
// callback, so this one can be safely skipped. If no newer activity
// arrived, this is the LAST edit in the burst and we forward to
// Vercel to ensure the live site picks it up.
//
// Signature verification is REQUIRED: the QStash receiver confirms
// the request originated from Upstash. Without it, anyone hitting this
// URL could trigger a deploy (DoS against the Vercel deploy quota).
//
// State (last-activity-at, last-forward-at) is shared with the leading-
// edge endpoint via Upstash Redis, so both layers see the same activity
// timeline and cooldown window.

import { Redis } from "@upstash/redis";
import type { APIRoute } from "astro";
import { qstashReceiver } from "../../lib/qstash";

export const prerender = false;

const DEBOUNCE_MS = 20_000;
const KEY_LAST_FORWARD = "sanity:debouncer:last-forward-at";
const KEY_LAST_ACTIVITY = "sanity:debouncer:last-activity-at";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
});

export const POST: APIRoute = async ({ request }) => {
  if (!qstashReceiver) {
    return new Response(
      JSON.stringify({
        status: "error",
        reason:
          "qstash receiver not configured (QSTASH_CURRENT_SIGNING_KEY / QSTASH_NEXT_SIGNING_KEY missing)",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Read the raw body for signature verification BEFORE any parsing.
  const rawBody = await request.text();
  const signature = request.headers.get("upstash-signature") ?? "";

  // Receiver.verify may return boolean (sync, v2) or Promise<boolean>
  // (async, v1) depending on the installed package version — awaiting
  // works for both.
  const isValid = await qstashReceiver.verify({ signature, body: rawBody });
  if (!isValid) {
    return new Response(JSON.stringify({ status: "error", reason: "invalid signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let scheduledAt = 0;
  try {
    const parsed = JSON.parse(rawBody);
    scheduledAt = Number(parsed?.scheduledAt ?? 0);
    if (!Number.isFinite(scheduledAt) || scheduledAt <= 0) {
      throw new Error("scheduledAt missing or invalid");
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ status: "error", reason: `bad payload: ${(err as Error).message}` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const now = Date.now();

  // Staleness check: if newer Sanity activity has arrived after this
  // QStash message was scheduled, a fresher trailing-edge callback is
  // already in flight (or about to be scheduled) and will handle the
  // forward. This is how a burst of N skipped webhooks collapses to a
  // single trailing-edge forward: each one schedules a QStash message,
  // and only the last one's staleness check passes.
  const currentActivity = Number((await redis.get<number>(KEY_LAST_ACTIVITY)) ?? 0);
  if (currentActivity > scheduledAt) {
    return new Response(
      JSON.stringify({
        status: "skipped",
        reason: "newer-activity-in-flight",
        scheduledAt,
        currentActivity,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Cooldown check (mirrors leading-edge): if the leading-edge
  // endpoint fired a forward very recently (e.g., a fresh webhook
  // arrived within the debounce window of the original forward),
  // skip to avoid double-deploying. The leading-edge forward captures
  // the latest state already.
  const lastForward = Number((await redis.get<number>(KEY_LAST_FORWARD)) ?? 0);
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

  return new Response(
    JSON.stringify({
      status: "forwarded",
      trigger: "trailing-edge",
      scheduledAt,
      msAfterScheduled: now - scheduledAt,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
