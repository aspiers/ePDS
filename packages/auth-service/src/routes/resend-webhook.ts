/**
 * Resend delivery webhook receiver.
 *
 * The route consumes the untouched request body, verifies Resend's Svix
 * signature before inspecting the payload, accepts only delivery events used
 * by ePDS, and emits one structured log entry per delivery attempt. Resend may
 * retry the same source ID (logged as `eventId`) and may deliver an email's
 * events out of order, so log consumers must deduplicate and order events when
 * calculating latency.
 */
import express, { Router } from 'express'
import addressparser from 'nodemailer/lib/addressparser/index.js'
import { Webhook } from 'svix'
import { createLogger } from '@certified-app/shared'

const logger = createLogger('auth:email-webhook')

export const RESEND_WEBHOOK_PATH = '/webhooks/resend'

const RESEND_EVENT_TYPES = [
  'email.sent',
  'email.delivered',
  'email.delivery_delayed',
  'email.bounced',
  'email.failed',
] as const

type ResendEventType = (typeof RESEND_EVENT_TYPES)[number]
type EmailDeliveryEventType =
  | 'sent'
  | 'delivered'
  | 'delayed'
  | 'bounced'
  | 'failed'

const NORMALIZED_EVENT_TYPES: Record<ResendEventType, EmailDeliveryEventType> =
  {
    'email.sent': 'sent',
    'email.delivered': 'delivered',
    'email.delivery_delayed': 'delayed',
    'email.bounced': 'bounced',
    'email.failed': 'failed',
  }

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

function parseSingleEmailAddress(value: string): string | null {
  try {
    const addresses = addressparser(value, { flatten: true })
    if (addresses.length !== 1) return null
    const address = addresses[0]?.address.trim().toLowerCase()
    return address || null
  } catch (err) {
    logger.warn({ err }, 'Failed to parse email sender address')
    return null
  }
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
      { err, provider: 'resend', eventId: headers['svix-id'] },
      'Rejected email webhook with invalid signature',
    )
    return { ok: false, error: 'Invalid webhook signature' }
  }

  if (!isResendEvent(payload)) {
    logger.warn(
      { provider: 'resend', eventId: headers['svix-id'] },
      'Rejected invalid email webhook payload',
    )
    return { ok: false, error: 'Invalid webhook payload' }
  }
  return { ok: true, headers, event: payload }
}

function logResendEvent(event: ResendEvent, svixId: string): void {
  const fields = {
    provider: 'resend',
    eventId: svixId,
    eventType: NORMALIZED_EVENT_TYPES[event.type],
    occurredAt: event.created_at,
    messageId: event.data.email_id,
    recipients: event.data.to,
    subject: event.data.subject,
  }
  const message = 'Received email delivery event'
  if (event.type === 'email.delivery_delayed') {
    logger.warn(fields, message)
  } else {
    logger.info(fields, message)
  }
}

export function createResendWebhookRouter(
  webhookSecret: string,
  expectedFrom: string,
): Router {
  const router = Router()
  const verifier = new Webhook(webhookSecret)
  const expectedFromAddress = parseSingleEmailAddress(expectedFrom)
  if (!expectedFromAddress) {
    throw new Error('RESEND_WEBHOOK_SECRET requires a valid SMTP_FROM address')
  }

  router.post(
    RESEND_WEBHOOK_PATH,
    express.raw({ type: 'application/json', limit: '64kb' }),
    (req, res) => {
      const result = verifyResendWebhook(req, verifier)
      if (!result.ok) {
        res.status(400).json({ error: result.error })
        return
      }

      const eventId = result.headers['svix-id']
      const eventFromAddress = parseSingleEmailAddress(result.event.data.from)
      if (eventFromAddress !== expectedFromAddress) {
        logger.debug(
          { provider: 'resend', eventId },
          'Ignored email webhook for another sender',
        )
        res.status(200).json({ received: true, ignored: true })
        return
      }

      logResendEvent(result.event, eventId)
      res.status(200).json({ received: true })
    },
  )

  return router
}
