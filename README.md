# Magic PDS

A passwordless [AT Protocol](https://atproto.com/) Personal Data Server (PDS) that replaces password-based authentication with email OTP codes.

**Live at:** `pds.certs.network`

## Architecture

```
                  +-----------------+
                  |   OAuth Client  |
                  | (maearth-demo,  |
                  |  Bluesky, etc.) |
                  +-------+---------+
                          |
                   1. PAR  |  7. Token exchange
                          v
           +-----------------------------+
           |          PDS Core           |
           |  (stock @atproto/pds +      |
           |   magic-callback endpoint)  |
           +-----------------------------+
                   |             ^
   2. AS metadata  |             | 6. Auth code issued
   redirects to    |             |    via /oauth/magic-callback
   auth subdomain  v             |
           +-----------------------------+
           |        Auth Service         |
           |  /oauth/authorize           |
           |  /auth/send-code            |
           |  /auth/verify-code          |
           |  /auth/consent              |
           |  /account/* (settings)      |
           +-----------------------------+
                          |
              3-5. Email  |  OTP code flow
                          v
                     User's inbox
```

### OAuth Flow

1. **Client sends PAR** to PDS (stock AT Protocol behavior)
2. **PDS AS metadata** points `authorization_endpoint` to the auth subdomain
3. **Auth service** shows email input form
4. **OTP code email** sent to user (6-digit code)
5. **User enters code** — verified, consent shown
6. **User approves** — redirected to PDS `/oauth/magic-callback`
7. **PDS creates account** (if new) and **issues authorization code**
8. **Client exchanges code** for tokens (standard OAuth)

Users get a random handle (e.g., `a3x9kf.pds.certs.network`) — no email-derived handles for privacy.

## Packages

| Package | Description |
|---------|-------------|
| `@magic-pds/shared` | Database (SQLite), crypto utilities, types, logger |
| `@magic-pds/auth-service` | Auth UI, OTP code flow, account settings |
| `@magic-pds/pds-core` | Wraps `@atproto/pds` with magic link integration |

## Quick Start

### Prerequisites

- Node.js >= 18.7.0
- pnpm 8+
- OpenSSL (for key generation)

### Setup

```bash
# Clone and install
git clone <repo-url> magic-pds
cd magic-pds
./scripts/setup.sh

# Generate a PLC rotation key
openssl ecparam -name secp256k1 -genkey -noout | \
  openssl ec -text -noout 2>/dev/null | \
  grep priv -A 3 | tail -n +2 | tr -d '[:space:]:'

# Add the key to .env
# PDS_PLC_ROTATION_KEY_K256_PRIVATE_KEY_HEX=<paste hex here>

# Configure your domain, email provider, etc. in .env
```

### Local Development

```bash
./scripts/dev.sh
```

This starts both services with `NODE_ENV=development` (disables secure cookies, uses `PDS_DEV_MODE=true`).

- PDS: http://localhost:3000
- Auth: http://localhost:3001
- MailHog (if Docker available): http://localhost:8025

### Production Deployment (Docker)

```bash
# Build and start
docker compose up -d

# Caddy handles TLS automatically
# Ensure DNS points:
#   pds.example    -> your server
#   auth.pds.example -> your server
#   *.pds.example  -> your server (for handle resolution)
```

## Configuration

See [`.env.example`](.env.example) for all configuration options. Key settings:

| Variable | Description |
|----------|-------------|
| `PDS_HOSTNAME` | Your PDS domain (e.g., `pds.certs.network`) |
| `AUTH_HOSTNAME` | Auth subdomain (e.g., `auth.pds.certs.network`) |
| `EMAIL_PROVIDER` | `smtp`, `sendgrid`, `ses`, or `postmark` |
| `PDS_PLC_ROTATION_KEY_K256_PRIVATE_KEY_HEX` | secp256k1 private key |

### Email Providers

- **SMTP**: Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- **SendGrid**: Set `SENDGRID_API_KEY`
- **AWS SES**: Set `AWS_SES_SMTP_USER`, `AWS_SES_SMTP_PASS`, `AWS_REGION`
- **Postmark**: Set `POSTMARK_SERVER_TOKEN`

## Testing

```bash
pnpm test           # run tests once
pnpm test:watch     # watch mode
```

## Security

- OTP codes: 6-digit, SHA-256 hashed in DB, single-use, 10-minute expiry
- CSRF protection on all forms
- Rate limiting: per-email, per-IP (DB-backed), plus request-level (in-memory)
- Anti-enumeration: same response regardless of account existence
- Timing-safe token comparison
- HttpOnly, SameSite cookies
- Security headers: HSTS, CSP, X-Frame-Options, X-Content-Type-Options

## Related

- [maearth-demo](https://github.com/holkexyz/maearth-demo) — Demo app with OAuth login + wallet UI
- [magic-wallet](https://github.com/holkexyz/magic-wallet) — Embedded Ethereum wallet service

## License

MIT
