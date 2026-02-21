export { EpdsDb } from './db.js'
export type {
  MagicLinkTokenRow,
  BackupEmailRow,
  EmailRateLimitRow,
  AuthFlowRow,
} from './db.js'
export {
  generateMagicLinkToken,
  hashToken,
  timingSafeEqual,
  generateCsrfToken,
  generateOtpCode,
  generateRandomHandle,
  signCallback,
  verifyCallback,
} from './crypto.js'
export type { CallbackParams } from './crypto.js'
export type {
  MagicLinkConfig,
  EmailConfig,
  AuthConfig,
  RateLimitConfig,
} from './types.js'
export { DEFAULT_RATE_LIMITS } from './types.js'
export { createLogger } from './logger.js'
export { escapeHtml, maskEmail } from './html.js'
