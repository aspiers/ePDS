import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MagicPdsDb } from '@magic-pds/shared'
import { MagicLinkTokenService } from '../magic-link/token.js'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'

describe('MagicLinkTokenService (OTP)', () => {
  let db: MagicPdsDb
  let service: MagicLinkTokenService
  let dbPath: string

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `test-otp-${Date.now()}.db`)
    db = new MagicPdsDb(dbPath)
    service = new MagicLinkTokenService(db, {
      expiryMinutes: 10,
      maxAttemptsPerToken: 5,
    })
  })

  afterEach(() => {
    db.close()
    try { fs.unlinkSync(dbPath) } catch {}
  })

  describe('create', () => {
    it('returns an 8-digit code and session ID', () => {
      const { code, sessionId } = service.create({
        email: 'test@example.com',
        authRequestId: 'req:123',
        clientId: null,
        deviceInfo: null,
      })

      expect(code).toMatch(/^\d{8}$/)
      expect(sessionId).toBeTruthy()
      expect(sessionId.length).toBe(64) // 32 bytes hex
    })
  })

  describe('verifyCode', () => {
    it('verifies a correct code', () => {
      const { code, sessionId } = service.create({
        email: 'test@example.com',
        authRequestId: 'req:123',
        clientId: 'client-1',
        deviceInfo: 'test-agent',
      })

      const result = service.verifyCode(sessionId, code)
      expect('error' in result).toBe(false)
      if (!('error' in result)) {
        expect(result.email).toBe('test@example.com')
        expect(result.authRequestId).toBe('req:123')
        expect(result.clientId).toBe('client-1')
      }
    })

    it('rejects an incorrect code', () => {
      const { sessionId } = service.create({
        email: 'test@example.com',
        authRequestId: 'req:123',
        clientId: null,
        deviceInfo: null,
      })

      const result = service.verifyCode(sessionId, '00000000')
      expect('error' in result).toBe(true)
    })

    it('rejects an already-used code', () => {
      const { code, sessionId } = service.create({
        email: 'test@example.com',
        authRequestId: 'req:123',
        clientId: null,
        deviceInfo: null,
      })

      service.verifyCode(sessionId, code) // first use
      const result = service.verifyCode(sessionId, code) // second use
      expect('error' in result).toBe(true)
    })

    it('rejects after too many attempts', () => {
      const { sessionId } = service.create({
        email: 'test@example.com',
        authRequestId: 'req:123',
        clientId: null,
        deviceInfo: null,
      })

      for (let i = 0; i < 6; i++) {
        service.verifyCode(sessionId, '99999999')
      }

      const result = service.verifyCode(sessionId, '99999999')
      expect('error' in result).toBe(true)
    })

    it('rejects invalid session ID', () => {
      const result = service.verifyCode('nonexistent', '12345678')
      expect('error' in result).toBe(true)
    })

    it('enforces per-email lockout after 15 total failures', () => {
      const email = 'lockout@example.com'

      // Create 15 separate sessions and fail once each to trigger the lockout
      for (let i = 0; i < 15; i++) {
        const { sessionId } = service.create({
          email,
          authRequestId: `req:${i}`,
          clientId: null,
          deviceInfo: null,
        })
        service.verifyCode(sessionId, '00000000') // wrong code → records failure
      }

      // 16th attempt: should be blocked by per-email lockout
      const { sessionId } = service.create({
        email,
        authRequestId: 'req:final',
        clientId: null,
        deviceInfo: null,
      })
      const result = service.verifyCode(sessionId, '00000000')
      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toContain('Too many failed attempts')
      }
    })
  })

  describe('cleanup', () => {
    it('removes expired tokens', () => {
      service.create({
        email: 'test@example.com',
        authRequestId: 'req:123',
        clientId: null,
        deviceInfo: null,
      })

      const cleaned = service.cleanup()
      expect(cleaned).toBe(0) // not expired yet
    })
  })
})
