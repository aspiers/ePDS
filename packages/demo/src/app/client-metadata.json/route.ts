/**
 * Dynamic OAuth client metadata endpoint.
 *
 * Served at /client-metadata.json so the client_id URL is self-referencing.
 * Adapts to PUBLIC_URL so it works in any deployment environment.
 */

import { NextResponse } from 'next/server'
import { getBaseUrl } from '@/lib/auth'

export const runtime = 'nodejs'

export function GET() {
  const baseUrl = getBaseUrl()

  const metadata = {
    client_id: `${baseUrl}/client-metadata.json`,
    client_name: 'ePDS Demo',
    client_uri: baseUrl,
    logo_uri: `${baseUrl}/certified-logo.png`,
    redirect_uris: [`${baseUrl}/api/oauth/callback`],
    scope: 'atproto transition:generic',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    dpop_bound_access_tokens: true,
    brand_color: '#2563eb',
    background_color: '#f8f9fa',
  }

  return NextResponse.json(metadata, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
