import { and, count, eq, gte, lt } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { behaviouralEvents } from "@child-safe-llm/db";

/**
 * Behavioural signals + rate limiting (phase 6.5.6, layer Q5).
 *
 * This is a MEDIUM-CONFIDENCE layer. The thresholds below are deliberate
 * starting points, not validated figures — they must be TUNED against real
 * traffic once the product has users. They are intentionally permissive enough
 * not to interrupt a normal, chatty child, while still throttling the rapid,
 * repeated probing pattern an attacker (or a bot) produces. Every threshold is
 * overridable via the matching `RATE_LIMIT_*` environment variable so they can
 * be tuned without a redeploy. See `.env.example`.
 *
 * The pipeline owns no database, so all of this lives in the web app, which
 * owns Postgres. Signals are recorded in the `behavioural_events` table.
 */

const numEnv = (key: string, fallback: number): number => {
  const raw = process.env[key];
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const BEHAVIOURAL_LIMITS = {
  // Session velocity: a single child sending messages too fast.
  velocityWindowSeconds: numEnv("RATE_LIMIT_VELOCITY_WINDOW_S", 60),
  maxMessagesPerWindow: numEnv("RATE_LIMIT_MAX_MESSAGES", 20),
  // Repeated-probe: a single child repeatedly tripping the guardrails.
  probeWindowSeconds: numEnv("RATE_LIMIT_PROBE_WINDOW_S", 300),
  maxProbesPerWindow: numEnv("RATE_LIMIT_MAX_PROBES", 4),
  // Device reputation: probes accumulated across a device (any child on it).
  reputationWindowSeconds: numEnv("RATE_LIMIT_REPUTATION_WINDOW_S", 3600),
  deviceProbeStrikeLimit: numEnv("RATE_LIMIT_DEVICE_PROBE_STRIKES", 8),
  // PIN brute-force (the retained minimum carried forward from plan item 9.5).
  pinWindowSeconds: numEnv("RATE_LIMIT_PIN_WINDOW_S", 900),
  maxPinFailures: numEnv("RATE_LIMIT_MAX_PIN_FAILURES", 5),
  // How long signals are retained before pruning. Must be >= every window
  // above so a prune never drops a row a check still needs.
  retentionSeconds: numEnv("RATE_LIMIT_RETENTION_S", 86400),
} as const;

export type BehaviouralLimits = typeof BEHAVIOURAL_LIMITS;

export type EventKind = "message" | "probe" | "rate_violation" | "pin_fail";

type Db = PostgresJsDatabase;

// --- Pure decision logic (unit-tested without a database) ---

export type ThrottleReason = "rate" | "probe" | "reputation";

export interface ChatSignalCounts {
  messageCount: number;
  sessionProbeCount: number;
  deviceProbeCount: number;
}

export type ChatVerdict =
  | { throttled: false }
  | {
      throttled: true;
      reason: ThrottleReason;
      retryAfterSeconds: number;
      message: string;
    };

const THROTTLE_MESSAGE =
  "You're sending messages very quickly. Take a short break and try again in a little while.";

export const decideChatThrottle = (
  counts: ChatSignalCounts,
  limits: BehaviouralLimits,
): ChatVerdict => {
  if (counts.messageCount >= limits.maxMessagesPerWindow) {
    return {
      throttled: true,
      reason: "rate",
      retryAfterSeconds: limits.velocityWindowSeconds,
      message: THROTTLE_MESSAGE,
    };
  }
  if (counts.sessionProbeCount >= limits.maxProbesPerWindow) {
    return {
      throttled: true,
      reason: "probe",
      retryAfterSeconds: limits.probeWindowSeconds,
      message: THROTTLE_MESSAGE,
    };
  }
  if (counts.deviceProbeCount >= limits.deviceProbeStrikeLimit) {
    return {
      throttled: true,
      reason: "reputation",
      retryAfterSeconds: limits.reputationWindowSeconds,
      message: THROTTLE_MESSAGE,
    };
  }
  return { throttled: false };
};

export type PinVerdict =
  | { locked: false }
  | { locked: true; retryAfterSeconds: number };

export const decidePinLock = (
  failCount: number,
  limits: BehaviouralLimits,
): PinVerdict =>
  failCount >= limits.maxPinFailures
    ? { locked: true, retryAfterSeconds: limits.pinWindowSeconds }
    : { locked: false };

// --- Database access ---

const countEventsSince = async (
  db: Db,
  opts: {
    kind: EventKind;
    windowSeconds: number;
    childId?: string;
    deviceToken?: string;
  },
): Promise<number> => {
  const since = new Date(Date.now() - opts.windowSeconds * 1000);
  const conditions = [
    eq(behaviouralEvents.kind, opts.kind),
    gte(behaviouralEvents.createdAt, since),
  ];
  if (opts.childId)
    conditions.push(eq(behaviouralEvents.childId, opts.childId));
  if (opts.deviceToken)
    conditions.push(eq(behaviouralEvents.deviceToken, opts.deviceToken));

  const [row] = await db
    .select({ value: count() })
    .from(behaviouralEvents)
    .where(and(...conditions));
  return row?.value ?? 0;
};

export const recordEvent = async (
  db: Db,
  event: { kind: EventKind; childId?: string; deviceToken?: string },
): Promise<void> => {
  await db.insert(behaviouralEvents).values({
    kind: event.kind,
    childId: event.childId ?? null,
    deviceToken: event.deviceToken ?? null,
  });
};

// Keep the table bounded: drop this child's / device's signals older than the
// retention window. Cheap (indexed) and runs on the chat write path.
export const pruneOldEvents = async (
  db: Db,
  key: { childId?: string; deviceToken?: string },
): Promise<void> => {
  const cutoff = new Date(
    Date.now() - BEHAVIOURAL_LIMITS.retentionSeconds * 1000,
  );
  if (key.childId) {
    await db
      .delete(behaviouralEvents)
      .where(
        and(
          eq(behaviouralEvents.childId, key.childId),
          lt(behaviouralEvents.createdAt, cutoff),
        ),
      );
  }
  if (key.deviceToken) {
    await db
      .delete(behaviouralEvents)
      .where(
        and(
          eq(behaviouralEvents.deviceToken, key.deviceToken),
          lt(behaviouralEvents.createdAt, cutoff),
        ),
      );
  }
};

// Read-only: does this chat request trip a velocity / probe / reputation limit?
export const evaluateChatRequest = async (
  db: Db,
  key: { childId: string; deviceToken?: string },
): Promise<ChatVerdict> => {
  const limits = BEHAVIOURAL_LIMITS;
  const [messageCount, sessionProbeCount, deviceProbeCount] = await Promise.all(
    [
      countEventsSince(db, {
        kind: "message",
        windowSeconds: limits.velocityWindowSeconds,
        childId: key.childId,
      }),
      countEventsSince(db, {
        kind: "probe",
        windowSeconds: limits.probeWindowSeconds,
        childId: key.childId,
      }),
      key.deviceToken
        ? countEventsSince(db, {
            kind: "probe",
            windowSeconds: limits.reputationWindowSeconds,
            deviceToken: key.deviceToken,
          })
        : Promise.resolve(0),
    ],
  );

  return decideChatThrottle(
    { messageCount, sessionProbeCount, deviceProbeCount },
    limits,
  );
};

// Read-only: is PIN entry for this child currently locked out?
export const evaluatePinAttempt = async (
  db: Db,
  key: { childId: string },
): Promise<PinVerdict> => {
  const failCount = await countEventsSince(db, {
    kind: "pin_fail",
    windowSeconds: BEHAVIOURAL_LIMITS.pinWindowSeconds,
    childId: key.childId,
  });
  return decidePinLock(failCount, BEHAVIOURAL_LIMITS);
};
