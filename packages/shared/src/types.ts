export interface EpdsLinkConfig {
  expiryMinutes: number
  maxAttemptsPerToken: number
}

export interface EmailConfig {
  provider: 'smtp' | 'sendgrid' | 'ses' | 'postmark'
  smtpHost?: string
  smtpPort?: number
  smtpUser?: string
  smtpPass?: string
  from: string
  fromName: string
}

export interface AuthConfig {
  hostname: string
  port: number
  sessionSecret: string
  csrfSecret: string
  pdsHostname: string
  pdsPublicUrl: string
  verificationLink: EpdsLinkConfig
  email: EmailConfig
  dbLocation: string
}

export interface RateLimitConfig {
  emailPer15Min: number
  emailPerHour: number
  ipPer15Min: number
  globalPerMinute: number
}

/** Better Auth email-code lifetime and delivery-latency threshold. */
export const OTP_LIFETIME_SECONDS = 10 * 60

export const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  emailPer15Min: 3,
  emailPerHour: 5,
  ipPer15Min: 10,
  globalPerMinute: 30,
}
