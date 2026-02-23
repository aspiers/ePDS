import { describe, it, expect } from 'vitest'
import * as crypto from 'crypto'
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  generateDpopKeyPair,
  restoreDpopKeyPair,
  createDpopProof,
} from '../lib/auth'

describe('generateCodeVerifier', () => {
  it('returns a base64url string', () => {
    const verifier = generateCodeVerifier()
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('has expected length (32 bytes → 43 chars base64url)', () => {
    expect(generateCodeVerifier()).toHaveLength(43)
  })

  it('produces unique values', () => {
    const a = generateCodeVerifier()
    const b = generateCodeVerifier()
    expect(a).not.toBe(b)
  })
})

describe('generateCodeChallenge', () => {
  it('returns a base64url SHA-256 hash of the verifier', () => {
    const verifier = 'test-verifier'
    const expected = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url')
    expect(generateCodeChallenge(verifier)).toBe(expected)
  })

  it('is deterministic', () => {
    const verifier = generateCodeVerifier()
    expect(generateCodeChallenge(verifier)).toBe(
      generateCodeChallenge(verifier),
    )
  })
})

describe('generateState', () => {
  it('returns a base64url string', () => {
    expect(generateState()).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('has expected length (16 bytes → 22 chars base64url)', () => {
    expect(generateState()).toHaveLength(22)
  })
})

describe('DPoP key pair', () => {
  it('generates an EC P-256 key pair with JWK exports', () => {
    const kp = generateDpopKeyPair()
    expect(kp.publicJwk.kty).toBe('EC')
    expect(kp.publicJwk.crv).toBe('P-256')
    expect(kp.privateJwk.kty).toBe('EC')
    expect(kp.privateJwk.d).toBeDefined() // private component
  })

  it('round-trips via restoreDpopKeyPair', () => {
    const original = generateDpopKeyPair()
    const restored = restoreDpopKeyPair(original.privateJwk)

    // Public JWKs should match (x, y coordinates)
    expect(restored.publicJwk.x).toBe(original.publicJwk.x)
    expect(restored.publicJwk.y).toBe(original.publicJwk.y)
  })
})

describe('createDpopProof', () => {
  const kp = generateDpopKeyPair()

  function decodePart(jwt: string, index: number) {
    const part = jwt.split('.')[index]
    return JSON.parse(Buffer.from(part, 'base64url').toString())
  }

  it('returns a 3-part JWT', () => {
    const proof = createDpopProof({
      privateKey: kp.privateKey,
      jwk: kp.publicJwk,
      method: 'POST',
      url: 'https://example.com/token',
    })
    expect(proof.split('.')).toHaveLength(3)
  })

  it('has correct header fields', () => {
    const proof = createDpopProof({
      privateKey: kp.privateKey,
      jwk: kp.publicJwk,
      method: 'POST',
      url: 'https://example.com/token',
    })
    const header = decodePart(proof, 0)
    expect(header.alg).toBe('ES256')
    expect(header.typ).toBe('dpop+jwt')
    expect(header.jwk).toEqual(kp.publicJwk)
  })

  it('has correct payload fields', () => {
    const proof = createDpopProof({
      privateKey: kp.privateKey,
      jwk: kp.publicJwk,
      method: 'POST',
      url: 'https://example.com/token',
    })
    const payload = decodePart(proof, 1)
    expect(payload.htm).toBe('POST')
    expect(payload.htu).toBe('https://example.com/token')
    expect(payload.iat).toBeTypeOf('number')
    expect(payload.jti).toBeTypeOf('string')
  })

  it('includes nonce when provided', () => {
    const proof = createDpopProof({
      privateKey: kp.privateKey,
      jwk: kp.publicJwk,
      method: 'POST',
      url: 'https://example.com/token',
      nonce: 'server-nonce-123',
    })
    const payload = decodePart(proof, 1)
    expect(payload.nonce).toBe('server-nonce-123')
  })

  it('includes ath when accessToken is provided', () => {
    const token = 'my-access-token'
    const proof = createDpopProof({
      privateKey: kp.privateKey,
      jwk: kp.publicJwk,
      method: 'GET',
      url: 'https://example.com/resource',
      accessToken: token,
    })
    const payload = decodePart(proof, 1)
    const expectedAth = crypto
      .createHash('sha256')
      .update(token)
      .digest('base64url')
    expect(payload.ath).toBe(expectedAth)
  })

  it('signature is verifiable with the public key', () => {
    const proof = createDpopProof({
      privateKey: kp.privateKey,
      jwk: kp.publicJwk,
      method: 'POST',
      url: 'https://example.com/token',
    })
    const [headerB64, payloadB64, sigB64] = proof.split('.')
    const signingInput = `${headerB64}.${payloadB64}`
    const sigRaw = Buffer.from(sigB64, 'base64url')

    // Convert raw r||s back to DER for Node's verify
    const r = sigRaw.subarray(0, 32)
    const s = sigRaw.subarray(32, 64)

    function toDerInt(buf: Buffer): Buffer {
      // Ensure positive (prepend 0x00 if high bit set)
      if (buf[0] & 0x80) {
        return Buffer.concat([Buffer.from([0x00]), buf])
      }
      // Strip leading zeros but keep at least one byte
      let i = 0
      while (i < buf.length - 1 && buf[i] === 0) i++
      return buf.subarray(i)
    }

    const rDer = toDerInt(r)
    const sDer = toDerInt(s)
    const seq = Buffer.concat([
      Buffer.from([0x02, rDer.length]),
      rDer,
      Buffer.from([0x02, sDer.length]),
      sDer,
    ])
    const derSig = Buffer.concat([Buffer.from([0x30, seq.length]), seq])

    const ok = crypto.verify(
      'sha256',
      Buffer.from(signingInput),
      kp.publicKey,
      derSig,
    )
    expect(ok).toBe(true)
  })
})
