import {
  MagicPdsDb,
  generateOtpCode,
  hashToken,
  timingSafeEqual,
  generateCsrfToken,
  type MagicLinkConfig,
} from '@magic-pds/shared'

/** Maximum total OTP failures per email in a 1-hour window before lockout. */
const OTP_LOCKOUT_THRESHOLD = 15

export interface VerifyResult {
  email: string
  authRequestId: string
  clientId: string | null
}

export class MagicLinkTokenService {
  constructor(
    private readonly db: MagicPdsDb,
    private readonly config: MagicLinkConfig,
  ) {}

  /**
   * Create an OTP code, store its hash in the DB, return the code + session ID.
   */
  create(data: {
    email: string
    authRequestId: string
    clientId: string | null
    deviceInfo: string | null
  }): { code: string; sessionId: string } {
    const { code, codeHash } = generateOtpCode()
    const sessionId = generateCsrfToken()
    const expiresAt = Date.now() + this.config.expiryMinutes * 60 * 1000

    this.db.createMagicLinkToken({
      tokenHash: sessionId, // repurpose token_hash as session ID
      email: data.email.toLowerCase(),
      expiresAt,
      authRequestId: data.authRequestId,
      clientId: data.clientId,
      deviceInfo: data.deviceInfo,
      csrfToken: sessionId, // keep csrf_token populated (same as session ID)
      codeHash,
    })

    return { code, sessionId }
  }

  /**
   * Verify an OTP code submitted by the user.
   */
  verifyCode(sessionId: string, submittedCode: string): VerifyResult | { error: string } {
    const row = this.db.getMagicLinkToken(sessionId)

    if (!row) {
      return { error: 'Invalid or expired code.' }
    }

    if (row.used) {
      return { error: 'This code has already been used.' }
    }

    if (row.expiresAt < Date.now()) {
      return { error: 'This code has expired. Please request a new one.' }
    }

    // Per-email lockout: reject if this email has too many recent failures across
    // all tokens (separate from the per-token attempt limit below).
    const ONE_HOUR_MS = 60 * 60 * 1000
    const recentFailures = this.db.getOtpFailureCount(row.email, ONE_HOUR_MS)
    if (recentFailures >= OTP_LOCKOUT_THRESHOLD) {
      return { error: 'Too many failed attempts. Please try again later.' }
    }

    // Increment attempts and check per-token limit
    const attempts = this.db.incrementTokenAttempts(sessionId)
    if (attempts > this.config.maxAttemptsPerToken) {
      this.db.markMagicLinkTokenUsed(sessionId)
      return { error: 'Too many attempts. Please request a new code.' }
    }

    // Compare submitted code hash against stored hash
    const submittedHash = hashToken(submittedCode)
    if (!row.codeHash || !timingSafeEqual(submittedHash, row.codeHash)) {
      // Record per-email failure for lockout tracking
      this.db.recordOtpFailure(row.email)
      return { error: 'Incorrect code. Please try again.' }
    }

    // Mark as used (single-use)
    this.db.markMagicLinkTokenUsed(sessionId)

    return {
      email: row.email,
      authRequestId: row.authRequestId,
      clientId: row.clientId,
    }
  }

  /**
   * Cleanup expired tokens (call periodically).
   */
  cleanup(): number {
    return this.db.cleanupExpiredTokens()
  }
}
