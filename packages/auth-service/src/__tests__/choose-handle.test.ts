/**
 * Unit tests for the handle selection flow.
 *
 * Tests the exported HANDLE_REGEX constant from choose-handle.ts,
 * covering format validation edge cases.
 */
import { describe, it, expect } from 'vitest'
import { HANDLE_REGEX } from '../routes/choose-handle.js'

describe('HANDLE_REGEX — valid handles', () => {
  it('accepts a simple lowercase word', () => {
    expect(HANDLE_REGEX.test('alice')).toBe(true)
  })

  it('accepts a handle with a hyphen in the middle', () => {
    expect(HANDLE_REGEX.test('my-handle')).toBe(true)
  })

  it('accepts a 5-character handle (min length)', () => {
    expect(HANDLE_REGEX.test('abcde')).toBe(true)
  })

  it('accepts a 20-character handle (max length)', () => {
    expect(HANDLE_REGEX.test('a'.repeat(20))).toBe(true)
  })

  it('accepts alphanumeric mix', () => {
    expect(HANDLE_REGEX.test('user123')).toBe(true)
  })

  it('accepts handle with multiple hyphens', () => {
    expect(HANDLE_REGEX.test('my-cool-handle')).toBe(true)
  })
})

describe('HANDLE_REGEX — invalid handles', () => {
  it('rejects a single character (too short)', () => {
    expect(HANDLE_REGEX.test('a')).toBe(false)
  })

  it('rejects two characters (too short)', () => {
    expect(HANDLE_REGEX.test('ab')).toBe(false)
  })

  it('rejects a 3-character handle (too short)', () => {
    expect(HANDLE_REGEX.test('abc')).toBe(false)
  })

  it('rejects a 4-character handle (too short)', () => {
    expect(HANDLE_REGEX.test('abcd')).toBe(false)
  })

  it('rejects a handle starting with a hyphen', () => {
    expect(HANDLE_REGEX.test('-abc')).toBe(false)
  })

  it('rejects a handle ending with a hyphen', () => {
    expect(HANDLE_REGEX.test('abc-')).toBe(false)
  })

  it('rejects uppercase letters', () => {
    expect(HANDLE_REGEX.test('ALICE')).toBe(false)
  })

  it('rejects mixed case', () => {
    expect(HANDLE_REGEX.test('Alice')).toBe(false)
  })

  it('rejects a handle with a space', () => {
    expect(HANDLE_REGEX.test('my name')).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(HANDLE_REGEX.test('')).toBe(false)
  })

  it('rejects a 21-character handle (too long)', () => {
    expect(HANDLE_REGEX.test('a'.repeat(21))).toBe(false)
  })

  it('rejects a handle with special characters', () => {
    expect(HANDLE_REGEX.test('hello!')).toBe(false)
  })

  it('rejects a handle with dots', () => {
    expect(HANDLE_REGEX.test('my.handle')).toBe(false)
  })

  it('rejects a handle with underscores', () => {
    expect(HANDLE_REGEX.test('my_handle')).toBe(false)
  })
})
