"use client"

import { useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import { AppLogo } from './components/AppLogo'

/**
 * Login page — Flow 1 (email or handle).
 *
 * The user enters an email address or ATProto handle. The form submits to
 * /api/oauth/login which starts the OAuth flow via PAR.
 */

function LoginForm() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const [submitting, setSubmitting] = useState(false)
  const [mode, setMode] = useState<'email' | 'handle'>('email')

  const switchMode = (newMode: 'email' | 'handle') => {
    setMode(newMode)
    setSubmitting(false)
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      padding: '20px',
      overflow: 'hidden',
      background: '#f8f9fa',
    }}>
      <div style={{
        maxWidth: '440px',
        width: '100%',
        textAlign: 'center',
      }}>
        <div style={{ marginBottom: '24px' }}>
          <AppLogo size={64} />
          <h1 style={{
            fontSize: '22px',
            fontWeight: 600,
            color: '#1a1a2e',
            margin: '12px 0 4px',
          }}>
            ePDS Demo
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            Sign in with your AT Protocol identity
          </p>
        </div>

        {error && (
          <div style={{
            background: '#fef2f2',
            color: '#dc2626',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            marginBottom: '16px',
            maxWidth: '290px',
            margin: '0 auto 16px',
          }}>
            {decodeURIComponent(error)}
          </div>
        )}

        <form
          action="/api/oauth/login"
          method="GET"
          style={{ margin: '0 auto', maxWidth: '290px' }}
          onSubmit={() => { setTimeout(() => setSubmitting(true), 0) }}
        >
          <div style={{ marginBottom: '16px', textAlign: 'left' }}>
            <label htmlFor={mode === 'email' ? 'email' : 'handle'} style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              color: '#1a1a2e',
              marginBottom: '6px',
            }}>
              {mode === 'email' ? 'Email address' : 'Handle'}
            </label>
            {mode === 'email' ? (
              <input
                type="email"
                id="email"
                name="email"
                required
                autoFocus
                placeholder="you@example.com"
                readOnly={submitting}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: '16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: submitting ? '#f5f5f5' : '#fff',
                  color: '#1a1a2e',
                }}
              />
            ) : (
              <input
                type="text"
                id="handle"
                name="handle"
                required
                autoFocus
                placeholder="you.bsky.social"
                readOnly={submitting}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: '16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: submitting ? '#f5f5f5' : '#fff',
                  color: '#1a1a2e',
                }}
              />
            )}
          </div>
          <button
            type="submit"
            disabled={submitting}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '14px 28px',
              fontSize: '16px',
              fontWeight: 500,
              color: '#ffffff',
              background: submitting ? '#4a4a4a' : '#2563eb',
              border: 'none',
              borderRadius: '8px',
              cursor: submitting ? 'default' : 'pointer',
              letterSpacing: '0.3px',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {mode === 'email' ? (
              submitting ? 'Sending verification code...' : (
                <>
                  <img src="/certified-logo.png" alt="" style={{ height: '20px' }} />
                  <span style={{ width: '12px', display: 'inline-block' }}></span>
                  Sign in with Certified
                </>
              )
            ) : (
              submitting ? 'Redirecting...' : 'Sign in'
            )}
          </button>
        </form>

        <p
          onClick={() => switchMode(mode === 'email' ? 'handle' : 'email')}
          style={{
            color: '#6b7280',
            fontSize: '13px',
            cursor: 'pointer',
            marginTop: '16px',
          }}
        >
          {mode === 'email' ? 'Sign in with ATProto/Bluesky' : 'Sign in with Certified'}
        </p>

        <a
          href="/flow2"
          style={{
            display: 'inline-block',
            marginTop: '8px',
            color: '#9ca3af',
            fontSize: '12px',
            textDecoration: 'none',
          }}
        >
          Test Flow 2 (no email form)
        </a>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
