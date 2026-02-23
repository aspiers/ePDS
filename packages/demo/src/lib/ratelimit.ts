/**
 * In-memory rate limiter (token bucket).
 *
 * Adapted from maearth-demo. Stripped: Upstash Redis, daily spending tracking.
 * Sufficient for a demo app; production apps should use a persistent store.
 */

const buckets = new Map<string, { tokens: number; lastRefill: number }>()

const CLEANUP_INTERVAL_MS = 60 * 1000
let cleanupTimer: ReturnType<typeof setInterval> | null = null

function ensureCleanup(windowMs: number) {
  if (cleanupTimer) return
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of buckets) {
      if (now - bucket.lastRefill > windowMs * 2) buckets.delete(key)
    }
  }, CLEANUP_INTERVAL_MS)
  cleanupTimer.unref()
}

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; retryAfter?: number } {
  ensureCleanup(windowMs)
  const now = Date.now()
  let bucket = buckets.get(key)

  if (!bucket) {
    bucket = { tokens: maxRequests, lastRefill: now }
    buckets.set(key, bucket)
  }

  const elapsed = now - bucket.lastRefill
  const refill = Math.floor((elapsed / windowMs) * maxRequests)
  if (refill > 0) {
    bucket.tokens = Math.min(maxRequests, bucket.tokens + refill)
    bucket.lastRefill = now
  }

  if (bucket.tokens > 0) {
    bucket.tokens--
    return { allowed: true }
  }

  const retryAfter = Math.ceil(windowMs / 1000)
  return { allowed: false, retryAfter }
}
