import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { checkRateLimit } from '../lib/ratelimit'

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows requests up to the limit', () => {
    // Use a unique key per test to avoid cross-test state
    const key = `test-allow-${Date.now()}`
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit(key, 3, 60_000).allowed).toBe(true)
    }
  })

  it('denies after limit is exhausted', () => {
    const key = `test-deny-${Date.now()}`
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key, 5, 60_000)
    }
    const result = checkRateLimit(key, 5, 60_000)
    expect(result.allowed).toBe(false)
  })

  it('returns retryAfter when denied', () => {
    const key = `test-retry-${Date.now()}`
    for (let i = 0; i < 2; i++) {
      checkRateLimit(key, 2, 30_000)
    }
    const result = checkRateLimit(key, 2, 30_000)
    expect(result.allowed).toBe(false)
    expect(result.retryAfter).toBe(30) // 30_000ms / 1000
  })

  it('refills tokens after window elapses', () => {
    const key = `test-refill-${Date.now()}`
    // Exhaust tokens
    for (let i = 0; i < 3; i++) {
      checkRateLimit(key, 3, 10_000)
    }
    expect(checkRateLimit(key, 3, 10_000).allowed).toBe(false)

    // Advance past the full window
    vi.advanceTimersByTime(10_000)

    expect(checkRateLimit(key, 3, 10_000).allowed).toBe(true)
  })
})
