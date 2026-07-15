import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import { Webhook } from 'svix'

const { logInfo, logWarn } = vi.hoisted(() => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}))

vi.mock('@certified-app/shared', () => ({
  createLogger: () => ({ info: logInfo, warn: logWarn }),
}))

import { createResendWebhookRouter } from '../routes/resend-webhook.js'

const WEBHOOK_SECRET = `whsec_${Buffer.from('test-webhook-secret').toString(
  'base64',
)}`

beforeEach(() => {
  logInfo.mockClear()
  logWarn.mockClear()
})

function makeEvent(type = 'email.sent'): Record<string, unknown> {
  return {
    type,
    created_at: '2026-07-14T10:00:00.000Z',
    data: {
      email_id: 'resend-email-123',
      to: ['person@example.com'],
      from: 'ePDS <login@example.org>',
      subject: 'Your sign-in code',
    },
  }
}

async function postWebhook(
  event: Record<string, unknown>,
  options: {
    svixId?: string
    validSignature?: boolean
    includeHeaders?: boolean
  } = {},
): Promise<{ status: number; json: Record<string, unknown> }> {
  const app = express()
  app.use(createResendWebhookRouter(WEBHOOK_SECRET))
  const server = app.listen(0)

  try {
    server.unref()
    const port = await new Promise<number>((resolve, reject) => {
      server.once('error', reject)
      server.once('listening', () => {
        const address = server.address()
        if (typeof address === 'object' && address) resolve(address.port)
        else reject(new Error('Failed to resolve ephemeral port'))
      })
    })

    const payload = JSON.stringify(event)
    const svixId = options.svixId ?? 'msg_test_123'
    const timestamp = new Date()
    const signature =
      options.validSignature === false
        ? 'v1,invalid'
        : new Webhook(WEBHOOK_SECRET).sign(svixId, timestamp, payload)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (options.includeHeaders !== false) {
      headers['svix-id'] = svixId
      headers['svix-timestamp'] = String(Math.floor(timestamp.getTime() / 1000))
      headers['svix-signature'] = signature
    }

    const response = await fetch(`http://127.0.0.1:${port}/webhooks/resend`, {
      method: 'POST',
      headers,
      body: payload,
    })
    return {
      status: response.status,
      json: (await response.json()) as Record<string, unknown>,
    }
  } finally {
    await new Promise<void>((resolve) => {
      server.close(() => {
        resolve()
      })
    })
  }
}

describe('Resend webhook receiver', () => {
  it('verifies, logs, and acknowledges a delivery event', async () => {
    const result = await postWebhook(makeEvent('email.delivered'))

    expect(result).toEqual({ status: 200, json: { received: true } })
    expect(logInfo).toHaveBeenCalledWith(
      {
        svixId: 'msg_test_123',
        eventType: 'email.delivered',
        eventCreatedAt: '2026-07-14T10:00:00.000Z',
        emailId: 'resend-email-123',
        recipients: ['person@example.com'],
        subject: 'Your sign-in code',
      },
      'Received Resend email delivery event',
    )
  })

  it('logs retries with the same Svix ID for downstream deduplication', async () => {
    await postWebhook(makeEvent(), { svixId: 'msg_retry' })
    await postWebhook(makeEvent(), { svixId: 'msg_retry' })

    expect(logInfo).toHaveBeenCalledTimes(2)
    expect(logInfo.mock.calls.map(([fields]) => fields.svixId)).toEqual([
      'msg_retry',
      'msg_retry',
    ])
  })

  it('logs delivery delays at warning level', async () => {
    await postWebhook(makeEvent('email.delivery_delayed'))

    expect(logWarn).toHaveBeenCalledWith(
      expect.objectContaining({
        svixId: 'msg_test_123',
        eventType: 'email.delivery_delayed',
        emailId: 'resend-email-123',
      }),
      'Received Resend email delivery event',
    )
  })

  it('rejects an invalid signature before logging the payload', async () => {
    const result = await postWebhook(makeEvent(), { validSignature: false })

    expect(result.status).toBe(400)
    expect(result.json).toEqual({ error: 'Invalid webhook signature' })
    expect(logInfo).not.toHaveBeenCalled()
  })

  it('rejects a request without the required Svix headers', async () => {
    const result = await postWebhook(makeEvent(), { includeHeaders: false })

    expect(result).toEqual({
      status: 400,
      json: { error: 'Invalid webhook request' },
    })
    expect(logInfo).not.toHaveBeenCalled()
  })

  it('rejects signed event types that are not used for delivery logs', async () => {
    const result = await postWebhook(makeEvent('email.opened'))

    expect(result.status).toBe(400)
    expect(result.json).toEqual({ error: 'Invalid webhook payload' })
    expect(logInfo).not.toHaveBeenCalled()
  })
})
