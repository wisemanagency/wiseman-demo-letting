// Upstash QStash client + receiver singletons.
//
// Used by the Sanity webhook debouncer for trailing-edge scheduling:
// each leading-edge "skipped" webhook schedules a QStash message at
// (now + debounceMs) targeting the trailing-edge endpoint. QStash
// guarantees the delivery — so a burst that ends mid-cooldown still
// gets one rebuild once things go quiet, rather than waiting for an
// unrelated future edit to trigger it.
//
// Both singletons are null when the relevant env vars are absent, so
// dev environments without QStash configured degrade gracefully to
// pure leading-edge-with-cooldown (no trailing-edge guarantee).

import { Client, Receiver } from "@upstash/qstash";

export const qstashClient: Client | null = process.env.QSTASH_TOKEN
  ? new Client({ token: process.env.QSTASH_TOKEN })
  : null;

export const qstashReceiver: Receiver | null =
  process.env.QSTASH_CURRENT_SIGNING_KEY && process.env.QSTASH_NEXT_SIGNING_KEY
    ? new Receiver({
        currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
        nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
      })
    : null;
