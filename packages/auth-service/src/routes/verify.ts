import { Router, type Request, type Response } from 'express'
import type { AuthServiceContext } from '../context.js'
import { getSessionCsrf } from '../middleware/session.js'
import { autoProvisionAccount } from '../lib/auto-provision.js'

/**
 * GET /auth/verify?token=...&csrf=...
 *
 * The magic link target. Verifies the token and either:
 * - Same device: redirects to consent screen
 * - Different device: shows "return to original browser" message
 *
 * If no account exists for the email, auto-provisions one.
 */
export function createVerifyRouter(ctx: AuthServiceContext): Router {
  const router = Router()

  router.get('/auth/verify', async (req: Request, res: Response) => {
    const token = req.query.token as string | undefined
    const csrfParam = req.query.csrf as string | undefined

    if (!token || !csrfParam) {
      res.status(400).send(renderVerifyResult({
        success: false,
        message: 'Invalid link. Missing required parameters.',
      }))
      return
    }

    // Get the session CSRF from the cookie (set when the email was requested)
    const sessionCsrf = getSessionCsrf(req)

    // Verify the token
    const result = ctx.tokenService.verify(token, sessionCsrf)

    if ('error' in result) {
      res.send(renderVerifyResult({
        success: false,
        message: result.error,
      }))
      return
    }

    const { email, authRequestId, clientId, sameDevice } = result

    // Check if account exists
    let did = ctx.db.getDidByEmail(email)
    if (!did) did = ctx.db.getDidByBackupEmail(email)

    const isNewAccount = !did

    // Auto-provision if no account exists
    if (!did) {
      did = await autoProvisionAccount(ctx, email) ?? undefined
      if (!did) {
        res.status(500).send(renderVerifyResult({
          success: false,
          message: 'Failed to create your account. Please try again.',
        }))
        return
      }
    }

    if (sameDevice) {
      // Same device: redirect to consent screen
      const consentUrl = `/auth/consent?request_uri=${encodeURIComponent(authRequestId)}&email=${encodeURIComponent(email)}&new=${isNewAccount ? '1' : '0'}${clientId ? '&client_id=' + encodeURIComponent(clientId) : ''}`
      res.redirect(303, consentUrl)
    } else {
      // Different device: show success message, tell user to go back
      res.send(renderVerifyResult({
        success: true,
        message: "You've verified your email. Return to your original browser to continue.",
        crossDevice: true,
      }))
    }
  })

  return router
}

function renderVerifyResult(opts: {
  success: boolean
  message: string
  crossDevice?: boolean
}): string {
  const icon = opts.success ? '&#10003;' : '&#10007;'
  const iconColor = opts.success ? '#28a745' : '#dc3545'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${opts.success ? 'Verified' : 'Verification Failed'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .container { background: white; border-radius: 12px; padding: 40px; max-width: 420px; width: 100%; box-shadow: 0 2px 8px rgba(0,0,0,0.08); text-align: center; }
    .icon { font-size: 48px; color: ${iconColor}; margin-bottom: 16px; }
    h1 { font-size: 24px; margin-bottom: 12px; color: #111; }
    p { color: #666; font-size: 15px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${icon}</div>
    <h1>${opts.success ? 'Email Verified' : 'Verification Failed'}</h1>
    <p>${escapeHtml(opts.message)}</p>
  </div>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
