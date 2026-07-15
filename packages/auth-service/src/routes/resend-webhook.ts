/**
 * Resend delivery webhook receiver.
 *
 * The route consumes the untouched request body, verifies Resend's Svix
 * signature before inspecting the payload, accepts only delivery events used
 * by ePDS, and emits one structured log entry per delivery attempt. Resend may
 * retry the same `svix-id` and may deliver an email's events out of order, so
 * log consumers must deduplicate and order events when calculating latency.
 */
import { createLogger } from '@certified-app/shared'
import express, { Router } from 'express'
import { Webhook } from 'svix'

const logger = createLogger('auth:resend-webhook')

const RESEND_EVENT_TYPES = [
  'email.sent',
  'email.delivered',
  'email.delivery_delayed',
  'email.bounced',
  'email.failed',
] as const

type ResendEventType = (typeof RESEND_EVENT_TYPES)[number]

interface ResendEvent {
  type: ResendEventType
  created_at: string
  data: {
    email_id: string
    to: string[]
    from: string
    subject: string
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isResendEvent(value: unknown): value is ResendEvent {
  if (!isRecord(value) || !isRecord(value.data)) return false

  const data = value.data
  return (
    typeof value.type === 'string' &&
    (RESEND_EVENT_TYPES as readonly string[]).includes(value.type) &&
    typeof value.created_at === 'string' &&
    Number.isFinite(Date.parse(value.created_at)) &&
    typeof data.email_id === 'string' &&
    Array.isArray(data.to) &&
    data.to.every((recipient) => typeof recipient === 'string') &&
    typeof data.from === 'string' &&
    typeof data.subject === 'string'
  )
}

interface SvixHeaders {
  'svix-id': string
  'svix-timestamp': string
  'svix-signature': string
}

type VerificationResult =
  | { ok: true; headers: SvixHeaders; event: ResendEvent }
  | {
      ok: false
      error:
        | 'Invalid webhook request'
        | 'Invalid webhook signature'
        | 'Invalid webhook payload'
    }

function getSvixHeaders(req: express.Request): SvixHeaders | null {
  const id = req.get('svix-id')
  const timestamp = req.get('svix-timestamp')
  const signature = req.get('svix-signature')
  if (!id || !timestamp || !signature) return null
  return {
    'svix-id': id,
    'svix-timestamp': timestamp,
    'svix-signature': signature,
  }
}

function verifyResendWebhook(
  req: express.Request,
  verifier: Webhook,
): VerificationResult {
  const headers = getSvixHeaders(req)
  if (!headers || !Buffer.isBuffer(req.body)) {
    return { ok: false, error: 'Invalid webhook request' }
  }

  let payload: unknown
  try {
    payload = verifier.verify(req.body, headers)
  } catch (err) {
    logger.warn(
      { err, svixId: headers['svix-id'] },
      'Rejected Resend webhook with invalid signature',
    )
    return { ok: false, error: 'Invalid webhook signature' }
  }

  if (!isResendEvent(payload)) {
    logger.warn(
      { svixId: headers['svix-id'] },
      'Rejected invalid Resend webhook payload',
    )
    return { ok: false, error: 'Invalid webhook payload' }
  }
  return { ok: true, headers, event: payload }
}

function logResendEvent(event: ResendEvent, svixId: string): void {
  const fields = {
    svixId,
    eventType: event.type,
    eventCreatedAt: event.created_at,
    emailId: event.data.email_id,
    recipients: event.data.to,
  }
  const message = 'Received Resend email delivery event'
  if (event.type === 'email.delivery_delayed') {
    logger.warn(fields, message)
  } else {
    logger.info(fields, message)
  }
}

export function createResendWebhookRouter(webhookSecret: string): Router {
  const router = Router()
  const verifier = new Webhook(webhookSecret)

  router.post(
    '/webhooks/resend',
    express.raw({ type: 'application/json', limit: '64kb' }),
    (req, res) => {
      const result = verifyResendWebhook(req, verifier)
      if (!result.ok) {
        res.status(400).json({ error: result.error })
        return
      }

      logResendEvent(result.event, result.headers['svix-id'])
      res.status(200).json({ received: true })
    },
  )

  return router
}
