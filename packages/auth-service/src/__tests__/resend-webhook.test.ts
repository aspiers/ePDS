import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { EpdsDb } from '@certified-app/shared'
import express from 'express'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { randomUUID } from 'node:crypto'
import { Webhook } from 'svix'
import { createResendWebhookRouter } from '../routes/resend-webhook.js'

const WEBHOOK_SECRET = `whsec_${Buffer.from('test-webhook-secret').toString(
  'base64',
)}`

let db: EpdsDb
let dbPath: string

beforeEach(() => {
  dbPath = path.join(os.tmpdir(), `resend-webhook-${randomUUID()}.sqlite`)
  db = new EpdsDb(dbPath)
})

afterEach(() => {
  db.close()
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      fs.unlinkSync(dbPath + suffix)
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
    }
  }
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
  app.use(createResendWebhookRouter(db, WEBHOOK_SECRET))
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
  it('verifies, persists, and acknowledges a delivery event', async () => {
    const result = await postWebhook(makeEvent('email.delivered'))

    expect(result).toEqual({
      status: 200,
      json: { received: true, duplicate: false },
    })
    expect(db.getResendEmailEvents('resend-email-123')).toMatchObject([
      {
        svixId: 'msg_test_123',
        eventType: 'email.delivered',
        recipients: ['person@example.com'],
      },
    ])
  })

  it('acknowledges a Svix retry without inserting it twice', async () => {
    const first = await postWebhook(makeEvent(), { svixId: 'msg_retry' })
    const retry = await postWebhook(makeEvent(), { svixId: 'msg_retry' })

    expect(first.json.duplicate).toBe(false)
    expect(retry).toEqual({
      status: 200,
      json: { received: true, duplicate: true },
    })
    expect(db.getResendEmailEvents('resend-email-123')).toHaveLength(1)
  })

  it('rejects an invalid signature before persisting the payload', async () => {
    const result = await postWebhook(makeEvent(), { validSignature: false })

    expect(result.status).toBe(400)
    expect(result.json).toEqual({ error: 'Invalid webhook signature' })
    expect(db.getResendEmailEvents('resend-email-123')).toHaveLength(0)
  })

  it('rejects a request without the required Svix headers', async () => {
    const result = await postWebhook(makeEvent(), { includeHeaders: false })

    expect(result).toEqual({
      status: 400,
      json: { error: 'Invalid webhook request' },
    })
    expect(db.getResendEmailEvents('resend-email-123')).toHaveLength(0)
  })

  it('rejects signed event types that are not used for delivery metrics', async () => {
    const result = await postWebhook(makeEvent('email.opened'))

    expect(result.status).toBe(400)
    expect(result.json).toEqual({ error: 'Invalid webhook payload' })
    expect(db.getResendEmailEvents('resend-email-123')).toHaveLength(0)
  })
})
