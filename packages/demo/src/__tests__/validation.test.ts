import { describe, it, expect } from 'vitest'
import {
  validateEmail,
  validateHandle,
  sanitizeForLog,
} from '../lib/validation'

describe('validateEmail', () => {
  it('accepts valid emails', () => {
    expect(validateEmail('user@example.com')).toBe(true)
    expect(validateEmail('foo+bar@baz.co.uk')).toBe(true)
    expect(validateEmail('a@b.c')).toBe(true)
  })

  it('rejects missing @', () => {
    expect(validateEmail('userexample.com')).toBe(false)
  })

  it('rejects spaces', () => {
    expect(validateEmail('user @example.com')).toBe(false)
    expect(validateEmail('user@ example.com')).toBe(false)
  })

  it('rejects double @', () => {
    expect(validateEmail('user@@example.com')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(validateEmail('')).toBe(false)
  })

  it('rejects missing TLD dot', () => {
    expect(validateEmail('user@example')).toBe(false)
  })
})

describe('validateHandle', () => {
  it('accepts valid AT Protocol handles', () => {
    expect(validateHandle('user.bsky.social')).toBe(true)
    expect(validateHandle('alice.example.com')).toBe(true)
    expect(validateHandle('my-name.bsky.social')).toBe(true)
  })

  it('rejects single segment', () => {
    expect(validateHandle('bsky')).toBe(false)
  })

  it('rejects leading dot', () => {
    expect(validateHandle('.bsky.social')).toBe(false)
  })

  it('rejects special characters', () => {
    expect(validateHandle('user!@bsky.social')).toBe(false)
    expect(validateHandle('user name.bsky.social')).toBe(false)
  })

  it('rejects trailing dot', () => {
    expect(validateHandle('bsky.social.')).toBe(false)
  })
})

describe('sanitizeForLog', () => {
  it('truncates DIDs', () => {
    const did = 'did:plc:abcdefghijklmnop'
    expect(sanitizeForLog(did)).toBe('did:plc:abcdefgh...')
  })

  it('passes through short DIDs unchanged', () => {
    const did = 'did:plc:abc'
    expect(sanitizeForLog(did)).toBe(did)
  })

  it('redacts emails', () => {
    expect(sanitizeForLog('alice@example.com')).toBe('a***@example.com')
  })

  it('truncates long strings', () => {
    const long = 'a'.repeat(30)
    const result = sanitizeForLog(long)
    expect(result).toBe('aaaaaaaaaa...aaaa')
    expect(result.length).toBeLessThan(long.length)
  })

  it('passes through short strings unchanged', () => {
    expect(sanitizeForLog('hello')).toBe('hello')
  })

  it('returns empty string for empty input', () => {
    expect(sanitizeForLog('')).toBe('')
  })
})
