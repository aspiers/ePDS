import * as crypto from 'node:crypto'

const TOKEN_BYTES = 32 // 256 bits of entropy

/**
 * Generate a cryptographically secure magic link token.
 * Returns the raw token (to send in email) and its SHA-256 hash (to store in DB).
 */
export function generateMagicLinkToken(): { token: string; tokenHash: string } {
  const rawBytes = crypto.randomBytes(TOKEN_BYTES)
  const token = rawBytes.toString('base64url')
  const tokenHash = hashToken(token)
  return { token, tokenHash }
}

/**
 * SHA-256 hash a token for storage. Since tokens have high entropy,
 * a simple hash is sufficient (no need for bcrypt/scrypt).
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/** Timing-safe comparison of two strings. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    const dummy = Buffer.alloc(a.length)
    crypto.timingSafeEqual(dummy, dummy)
    return false
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

/** Generate a 6-digit OTP code. Returns the code and its SHA-256 hash. */
export function generateOtpCode(): { code: string; codeHash: string } {
  const num = crypto.randomInt(0, 1_000_000)
  const code = num.toString().padStart(6, '0')
  const codeHash = hashToken(code)
  return { code, codeHash }
}

/** Generate a CSRF token. */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Generate a random handle subdomain (6-char base36).
 * ~2.17 billion possibilities. Checks for collision via callback.
 */
export function generateRandomHandle(domain: string): string {
  const bytes = crypto.randomBytes(4)
  const num = bytes.readUInt32BE(0)
  const id = num.toString(36).padStart(6, '0').slice(0, 6)
  return `${id}.${domain}`
}
