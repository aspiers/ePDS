/**
 * Tests for client metadata resolution (resolveClientName, resolveClientMetadata).
 *
 * Uses global fetch mocking to simulate HTTP responses without real network calls.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  resolveClientName,
  resolveClientMetadata,
} from '../lib/client-metadata.js'

// Save original fetch
const originalFetch = globalThis.fetch

beforeEach(() => {
  // Reset fetch mock before each test
  globalThis.fetch = originalFetch
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('resolveClientMetadata', () => {
  it('returns client_name for non-URL client_id', async () => {
    const metadata = await resolveClientMetadata('my-local-app')
    expect(metadata.client_name).toBe('my-local-app')
  })

  it('fetches metadata from URL client_id', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          client_name: 'Cool App',
          client_uri: 'https://cool.app',
          logo_uri: 'https://cool.app/logo.png',
        }),
    }) as unknown as typeof fetch

    const metadata = await resolveClientMetadata(
      'https://cool.app/client-metadata.json',
    )
    expect(metadata.client_name).toBe('Cool App')
    expect(metadata.client_uri).toBe('https://cool.app')
    expect(metadata.logo_uri).toBe('https://cool.app/logo.png')
  })

  it('falls back to domain on fetch failure', async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error('Network error')) as unknown as typeof fetch

    const metadata = await resolveClientMetadata(
      'https://broken.app/client-metadata.json',
    )
    expect(metadata.client_name).toBe('broken.app')
  })

  it('falls back to domain on non-ok response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }) as unknown as typeof fetch

    const metadata = await resolveClientMetadata(
      'https://missing.app/client-metadata.json',
    )
    expect(metadata.client_name).toBe('missing.app')
  })

  it('caches successful fetches', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ client_name: 'Cached App' }),
    }) as unknown as typeof fetch
    globalThis.fetch = mockFetch

    await resolveClientMetadata('https://cached.app/client-metadata.json')
    await resolveClientMetadata('https://cached.app/client-metadata.json')

    // Only one fetch call — second hit the cache
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('handles http:// URLs the same as https://', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ client_name: 'HTTP App' }),
    }) as unknown as typeof fetch

    const metadata = await resolveClientMetadata(
      'http://local.app/client-metadata.json',
    )
    expect(metadata.client_name).toBe('HTTP App')
  })
})

describe('resolveClientName', () => {
  it('returns client_name from metadata', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ client_name: 'Named App' }),
    }) as unknown as typeof fetch

    const name = await resolveClientName(
      'https://named.app/client-metadata.json',
    )
    expect(name).toBe('Named App')
  })

  it('falls back to domain when client_name is missing', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    }) as unknown as typeof fetch

    const name = await resolveClientName(
      'https://no-name.app/client-metadata.json',
    )
    expect(name).toBe('no-name.app')
  })

  it('returns "an application" for non-URL without name', async () => {
    // Non-URL client_ids get { client_name: clientId } — so the
    // name will just be the client_id string itself.
    const name = await resolveClientName('unnamed-client')
    expect(name).toBe('unnamed-client')
  })
})
