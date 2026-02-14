import { Router, type Request, type Response } from 'express'
import type { AuthServiceContext } from '../context.js'
import { createLogger } from '@magic-pds/shared'
import { resolveClientName } from '../lib/client-metadata.js'

const logger = createLogger('auth:send-code')

export function createSendCodeRouter(ctx: AuthServiceContext): Router {
  const router = Router()

  router.post('/auth/send-code', async (req: Request, res: Response) => {
    const email = (req.body.email as string || '').trim().toLowerCase()
    const requestUri = req.body.request_uri as string
    const clientId = req.body.client_id as string || ''

    if (!email || !requestUri) {
      res.status(400).send('<p>Email and request URI are required.</p>')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).send('<p>Please enter a valid email address.</p>')
      return
    }

    const ip = req.ip || req.socket.remoteAddress || null
    const rateLimitError = ctx.rateLimiter.check(email, ip)
    if (rateLimitError) {
      // Still show OTP form to avoid enumeration
      res.send(renderOtpForm({
        email,
        sessionId: '',
        requestUri,
        clientId,
        csrfToken: res.locals.csrfToken,
        error: 'Too many requests. Please wait a moment.',
      }))
      return
    }

    try {
      const deviceInfo = req.headers['user-agent'] || null
      const { code, sessionId } = ctx.tokenService.create({
        email,
        authRequestId: requestUri,
        clientId: clientId || null,
        deviceInfo,
      })

      const isNewUser = !ctx.db.getDidByEmail(email)
      const clientName = clientId ? await resolveClientName(clientId) : 'your application'

      await ctx.emailSender.sendOtpCode({
        to: email,
        code,
        clientAppName: clientName,
        clientId: clientId || undefined,
        pdsName: ctx.config.hostname,
        pdsDomain: ctx.config.pdsHostname,
        isNewUser,
      })

      ctx.rateLimiter.record(email, ip)

      res.send(renderOtpForm({
        email,
        sessionId,
        requestUri,
        clientId,
        csrfToken: res.locals.csrfToken,
      }))
    } catch (err) {
      logger.error({ err }, 'Failed to send OTP code')
      res.status(500).send(renderOtpForm({
        email,
        sessionId: '',
        requestUri,
        clientId,
        csrfToken: res.locals.csrfToken,
        error: 'Failed to send code. Please try again.',
      }))
    }
  })

  return router
}

export function renderOtpForm(opts: {
  email: string
  sessionId: string
  requestUri: string
  clientId: string
  csrfToken: string
  error?: string
}): string {
  const maskedEmail = maskEmail(opts.email)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Enter your code</title>
  <style>${CSS}</style>
</head>
<body>
  <div class="container">
    <h1>Enter your code</h1>
    <p class="subtitle">We sent a 6-digit code to <strong>${escapeHtml(maskedEmail)}</strong></p>
    ${opts.error ? '<p class="error">' + escapeHtml(opts.error) + '</p>' : ''}
    <form method="POST" action="/auth/verify-code">
      <input type="hidden" name="csrf" value="${escapeHtml(opts.csrfToken)}">
      <input type="hidden" name="session_id" value="${escapeHtml(opts.sessionId)}">
      <input type="hidden" name="request_uri" value="${escapeHtml(opts.requestUri)}">
      <input type="hidden" name="client_id" value="${escapeHtml(opts.clientId)}">
      <input type="hidden" name="email" value="${escapeHtml(opts.email)}">
      <div class="field">
        <input type="text" id="code" name="code" required autofocus
               maxlength="6" pattern="[0-9]{6}" inputmode="numeric" autocomplete="one-time-code"
               placeholder="000000" class="otp-input">
      </div>
      <button type="submit" class="btn-primary">Verify</button>
    </form>
    <form method="POST" action="/auth/send-code" style="margin-top: 12px;">
      <input type="hidden" name="csrf" value="${escapeHtml(opts.csrfToken)}">
      <input type="hidden" name="request_uri" value="${escapeHtml(opts.requestUri)}">
      <input type="hidden" name="client_id" value="${escapeHtml(opts.clientId)}">
      <input type="hidden" name="email" value="${escapeHtml(opts.email)}">
      <button type="submit" class="btn-secondary">Resend code</button>
    </form>
  </div>
</body>
</html>`
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return email
  if (local.length <= 2) return local[0] + '***@' + domain
  return local[0] + '***' + local[local.length - 1] + '@' + domain
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
  .container { background: white; border-radius: 12px; padding: 40px; max-width: 420px; width: 100%; box-shadow: 0 2px 8px rgba(0,0,0,0.08); text-align: center; }
  h1 { font-size: 24px; margin-bottom: 8px; color: #111; }
  .subtitle { color: #666; margin-bottom: 20px; font-size: 15px; line-height: 1.5; }
  .field { margin-bottom: 20px; }
  .otp-input { width: 100%; padding: 14px; border: 1px solid #ddd; border-radius: 8px; font-size: 28px; text-align: center; letter-spacing: 8px; font-family: 'SF Mono', Menlo, Consolas, monospace; outline: none; }
  .otp-input:focus { border-color: #0f1828; }
  .btn-primary { width: 100%; padding: 12px; background: #0f1828; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 500; cursor: pointer; }
  .btn-primary:hover { background: #1a2a40; }
  .btn-secondary { display: inline-block; color: #0f1828; background: none; border: none; font-size: 14px; cursor: pointer; text-decoration: underline; }
  .error { color: #dc3545; background: #fdf0f0; padding: 12px; border-radius: 8px; margin: 12px 0; }
`
