import { describe, it, expect } from 'vitest'
import { validateLocalPart, LOCAL_PART_MIN, LOCAL_PART_MAX } from '../handle.js'

describe('validateLocalPart', () => {
  const domain = 'pds.example.com'

  it('accepts a valid handle local part', () => {
    const result = validateLocalPart('alice', domain)
    expect(result).toBe('alice')
  })

  it('normalizes uppercase to lowercase', () => {
    const result = validateLocalPart('ALICE', domain)
    expect(result).toBe('alice')
  })

  it('accepts exactly LOCAL_PART_MIN characters', () => {
    const local = 'a'.repeat(LOCAL_PART_MIN)
    const result = validateLocalPart(local, domain)
    expect(result).toBe(local)
  })

  it('accepts exactly LOCAL_PART_MAX characters', () => {
    const local = 'a'.repeat(LOCAL_PART_MAX)
    const result = validateLocalPart(local, domain)
    expect(result).toBe(local)
  })

  it('rejects local part shorter than LOCAL_PART_MIN', () => {
    const local = 'a'.repeat(LOCAL_PART_MIN - 1)
    expect(validateLocalPart(local, domain)).toBeNull()
  })

  it('rejects local part longer than LOCAL_PART_MAX', () => {
    const local = 'a'.repeat(LOCAL_PART_MAX + 1)
    expect(validateLocalPart(local, domain)).toBeNull()
  })

  it('rejects local part containing dots', () => {
    expect(validateLocalPart('alice.bob', domain)).toBeNull()
  })

  it('rejects invalid handle characters', () => {
    // Underscore is not valid in atproto handles
    expect(validateLocalPart('alice_bob', domain)).toBeNull()
  })

  it('accepts hyphens in local part', () => {
    const result = validateLocalPart('alice-bob', domain)
    expect(result).toBe('alice-bob')
  })

  it('accepts numeric local parts', () => {
    const result = validateLocalPart('12345', domain)
    expect(result).toBe('12345')
  })

  it('accepts alphanumeric local parts', () => {
    const result = validateLocalPart('alice123', domain)
    expect(result).toBe('alice123')
  })

  it('rejects empty string', () => {
    expect(validateLocalPart('', domain)).toBeNull()
  })

  it('exports LOCAL_PART_MIN and LOCAL_PART_MAX constants', () => {
    expect(LOCAL_PART_MIN).toBe(5)
    expect(LOCAL_PART_MAX).toBe(20)
  })
})
