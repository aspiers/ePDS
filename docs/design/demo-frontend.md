# Demo Frontend (`packages/demo`)

Tutorial scaffold: a minimal Next.js app that authenticates users through an
ePDS instance using AT Protocol OAuth (PAR + PKCE + DPoP). Lives inside the
ePDS monorepo as a reference for developers building their own frontends.

## Source material

Most code is adapted from `../maearth-demo` (the Ma Earth demo app). That app
has wallet integration, 2FA, Redis-backed rate limiting, and CSRF protection —
all stripped here to keep the tutorial focused on the core OAuth flow.

## Scope

### Keep (core OAuth plumbing)

| maearth-demo source                       | demo destination                          | Changes                                                                |
| ----------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------- |
| `src/lib/auth.ts`                         | `src/lib/auth.ts`                         | Remove `certs.network` defaults; use `pds.example` from docker-compose |
| `src/lib/session.ts`                      | `src/lib/session.ts`                      | Remove 2FA `verified` field                                            |
| `src/lib/validation.ts`                   | `src/lib/validation.ts`                   | Copy as-is                                                             |
| `src/lib/ratelimit.ts`                    | `src/lib/ratelimit.ts`                    | In-memory only — drop Upstash Redis and daily spending tracking        |
| `src/app/api/oauth/login/route.ts`        | `src/app/api/oauth/login/route.ts`        | Keep email + handle modes                                              |
| `src/app/api/oauth/callback/route.ts`     | `src/app/api/oauth/callback/route.ts`     | Remove 2FA check, wallet provisioning                                  |
| `src/app/client-metadata.json/route.ts`   | `src/app/client-metadata.json/route.ts`   | Rebrand to "ePDS Demo"                                                 |
| `src/app/page.tsx`                        | `src/app/page.tsx`                        | Rebrand; keep "Sign in with Certified"                                 |
| `src/app/flow2/page.tsx`                  | `src/app/flow2/page.tsx`                  | Rebrand; keep "Sign in with Certified"                                 |
| `src/app/welcome/page.tsx`                | `src/app/welcome/page.tsx`                | Show handle + DID + sign out only                                      |
| `src/app/layout.tsx`                      | `src/app/layout.tsx`                      | New color scheme                                                       |

### Strip entirely

- **2FA** — `twofa.ts`, `verify-2fa/` page, `api/twofa/*` routes
- **Wallet** — `wallet/` routes, `WalletCard.tsx`, `SendTransaction.tsx`, `audit.ts`
- **CSRF** — `csrf.ts` (no POST endpoints in simplified demo need it)
- **Upstash Redis** — use in-memory rate limiter only
- **Dependencies**: `@simplewebauthn/*`, `otpauth`, `qrcode`, `nodemailer`, `@upstash/redis`
- **Settings page** — `welcome/settings/`

## Branding

App name: **ePDS Demo** (neutral/tutorial-oriented).

The login button text remains **"Sign in with Certified"** — this is the ePDS
auth service brand, not the app brand.

### Color scheme (blue-gray, generic)

| Token          | Value     | Description      |
| -------------- | --------- | ---------------- |
| `background`   | `#f8f9fa` | Light gray       |
| `surface`      | `#ffffff` | White cards      |
| `primary`      | `#2563eb` | Blue-600         |
| `primary-hover`| `#1d4ed8` | Blue-700         |
| `text`         | `#1a1a2e` | Near-black navy  |
| `text-muted`   | `#6b7280` | Gray-500         |
| `border`       | `#e5e7eb` | Gray-200         |
| `button-text`  | `#ffffff` | White            |
| `error-bg`     | `#fef2f2` | Light red        |
| `error-text`   | `#dc2626` | Red              |

### Logo

Inline SVG "key" icon — no external image files. The `certified-logo.png` from
maearth-demo is kept for the "Sign in with Certified" button (copied to
`public/`).

### OAuth client metadata (`/client-metadata.json`)

```json
{
  "client_name": "ePDS Demo",
  "brand_color": "#2563eb",
  "background_color": "#f8f9fa"
}
```

No `email_template_uri` or `email_subject_template` — let the PDS use its
defaults.

## Default PDS endpoints

Derived from the docker-compose defaults (`PDS_HOSTNAME=pds.example`, Caddy on
`:443`):

| Variable        | Default                                          |
| --------------- | ------------------------------------------------ |
| `PDS_URL`       | `https://pds.example`                            |
| `AUTH_ENDPOINT` | `https://auth.pds.example/oauth/authorize`       |

These match the Caddyfile's `{$PDS_HOSTNAME:pds.example}` placeholder, so the
demo works out of the box with `docker compose up`.

For local dev without Caddy, set `PDS_URL=http://localhost:3000` and
`AUTH_ENDPOINT=http://localhost:3001/oauth/authorize` in `.env.local`.

## Package configuration

| Field   | Value                  |
| ------- | ---------------------- |
| name    | `@certified-app/demo`  |
| private | `true`                 |
| type    | `module`               |

### Framework

Next.js 15 + React 19 (same versions as maearth-demo).

### Monorepo integration

- `pnpm-workspace.yaml` already covers `packages/*` — auto-included.
- Root `tsconfig.json` — **do not** add a reference. The demo uses Next.js's
  own `tsconfig.json` (`module: esnext`, `moduleResolution: bundler`) which is
  incompatible with the monorepo's composite build (`module: Node16`).
- Root `package.json` — add `dev:demo` script.
- The demo is self-contained: no imports from `@certified-app/shared` or other
  workspace packages. Third-party developers won't have access to ePDS
  internals.

## File structure

```
packages/demo/
  package.json
  tsconfig.json
  next.config.ts
  .env.example
  public/
    certified-logo.png
  src/
    app/
      layout.tsx
      page.tsx                          # Login (email/handle toggle)
      flow2/
        page.tsx                        # Flow 2 (button-only)
      welcome/
        page.tsx                        # Post-login (handle + DID + sign out)
      api/
        oauth/
          login/route.ts                # PAR + redirect
          callback/route.ts             # Token exchange + session
      client-metadata.json/
        route.ts                        # Dynamic OAuth client metadata
    lib/
      auth.ts                           # PKCE, DPoP, PAR/token, handle/DID resolution
      session.ts                        # HMAC-signed cookie sessions
      validation.ts                     # Email/handle validation
      ratelimit.ts                      # In-memory rate limiter only
```

## Implementation steps

1. **Scaffold package** — `package.json`, `tsconfig.json`, `next.config.ts`,
   `.env.example`, copy `certified-logo.png`
2. **Port `src/lib/`** — auth, session, validation, ratelimit (strip
   Redis/2FA/wallet/CSRF)
3. **Port API routes** — `oauth/login`, `oauth/callback`,
   `client-metadata.json` (strip 2FA/wallet)
4. **Build pages** — layout, login, flow2, welcome with new branding
5. **Wire into monorepo** — `dev:demo` script in root `package.json`
6. **Smoke test** — `pnpm install`, `pnpm dev:demo`, verify login flow
