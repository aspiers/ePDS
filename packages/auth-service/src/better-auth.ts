/**
 * Better Auth configuration for the auth service.
 *
 * This module creates and exports a better-auth instance configured with:
 * - Email OTP plugin (for future migration from custom OTP implementation)
 * - Social providers (Google, GitHub — only when env vars are set)
 * - Session lifetime from env vars
 *
 * The instance is mounted at /api/auth/* alongside the existing custom routes.
 * No existing behavior is changed — this is a foundation-only step.
 */
import Database from 'better-sqlite3'
import { betterAuth } from 'better-auth'
import { emailOTP } from 'better-auth/plugins'
import type { EmailSender } from './email/sender.js'

/**
 * Build the social providers config from env vars.
 * Only includes providers where both client ID and secret are set.
 */
function buildSocialProviders(): Record<string, { clientId: string; clientSecret: string }> {
  const providers: Record<string, { clientId: string; clientSecret: string }> = {}

  const googleId = process.env.GOOGLE_CLIENT_ID
  const googleSecret = process.env.GOOGLE_CLIENT_SECRET
  if (googleId && googleSecret) {
    providers.google = { clientId: googleId, clientSecret: googleSecret }
  }

  const githubId = process.env.GITHUB_CLIENT_ID
  const githubSecret = process.env.GITHUB_CLIENT_SECRET
  if (githubId && githubSecret) {
    providers.github = { clientId: githubId, clientSecret: githubSecret }
  }

  return providers
}

/** Social providers that were configured — exported for use by the login page. */
export let socialProviders: Record<string, { clientId: string; clientSecret: string }> = {}

/**
 * Create a better-auth instance wired to the given EmailSender.
 *
 * Called once during app startup from index.ts.
 * Returns `unknown` to avoid leaking the better-sqlite3 type into declaration files;
 * callers cast to the actual type via the `BetterAuthInstance` helper below.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createBetterAuth(emailSender: EmailSender): any {
  const dbLocation = process.env.DB_LOCATION ?? './data/magic-pds.sqlite'
  const authHostname = process.env.AUTH_HOSTNAME ?? 'auth.localhost'
  const pdsName = process.env.SMTP_FROM_NAME ?? 'Magic PDS'
  const pdsDomain = process.env.PDS_HOSTNAME ?? 'localhost'

  // Session lifetime from env (in seconds, default 7 days / 1 day update age)
  const sessionExpiresIn = parseInt(process.env.SESSION_EXPIRES_IN ?? String(7 * 24 * 60 * 60), 10)
  const sessionUpdateAge = parseInt(process.env.SESSION_UPDATE_AGE ?? String(24 * 60 * 60), 10)

  socialProviders = buildSocialProviders()

  const db = new Database(dbLocation)

  return betterAuth({
    database: db,
    baseURL: `https://${authHostname}`,
    basePath: '/api/auth',

    session: {
      expiresIn: sessionExpiresIn,
      updateAge: sessionUpdateAge,
    },

    socialProviders,

    plugins: [
      emailOTP({
        otpLength: 8,
        expiresIn: 600,
        allowedAttempts: 5,
        storeOTP: 'hashed',

        // Wire OTP sending to the existing EmailSender.
        // Not awaited internally to avoid timing side-channels (fire and forget).
        async sendVerificationOTP({ email, otp, type }) {
          const isNewUser = type === 'sign-in'
          emailSender.sendOtpCode({
            to: email,
            code: otp,
            clientAppName: pdsName,
            pdsName,
            pdsDomain,
            isNewUser,
          }).catch((err: unknown) => {
            // Log and swallow — caller does not await this
            console.error({ err, email, type }, 'better-auth: failed to send OTP email')
          })
        },
      }),
    ],
  })
}


