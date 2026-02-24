#!/bin/bash
set -euo pipefail

echo "=== ePDS Setup ==="
echo ""

# Check prerequisites
for cmd in pnpm openssl node; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "ERROR: $cmd is required but not installed."
    exit 1
  fi
done

echo "Node version: $(node --version)"
echo "pnpm version: $(pnpm --version)"
echo ""

# Generate a hex secret
generate_secret() {
  openssl rand -hex 32
}

# Portable sed in-place (works on macOS and Linux)
sed_inplace() {
  if sed --version 2>/dev/null | grep -q GNU; then
    sed -i "$1" "$2"
  else
    sed -i '' "$1" "$2"
  fi
}

if [ ! -f .env ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env

  # Auto-generate all secrets
  for var in PDS_JWT_SECRET PDS_DPOP_SECRET AUTH_SESSION_SECRET AUTH_CSRF_SECRET PDS_ADMIN_PASSWORD MAGIC_CALLBACK_SECRET MAGIC_INTERNAL_SECRET; do
    secret=$(generate_secret)
    sed_inplace "s|^${var}=$|${var}=${secret}|" .env
    echo "  Generated $var"
  done

  echo ""
  echo "You still need to configure:"
  echo "  1. PDS_HOSTNAME         - Your domain (e.g. pds.example.com)"
  echo "  2. AUTH_HOSTNAME        - Auth subdomain (e.g. auth.pds.example.com)"
  echo "  3. PDS_PLC_ROTATION_KEY_K256_PRIVATE_KEY_HEX - Generate with:"
  echo "     openssl ecparam -name secp256k1 -genkey -noout | openssl ec -text -noout 2>/dev/null | grep priv -A 3 | tail -n +2 | tr -d '[:space:]:'"
  echo "  4. SMTP settings        - For email delivery"
  echo "  5. MAGIC_LINK_BASE_URL  - Must match your AUTH_HOSTNAME"
  echo "  6. SMTP_FROM            - Must match your domain"
else
  echo ".env already exists, skipping generation."
fi

echo ""

# Install dependencies
echo "Installing dependencies..."
pnpm install

# Build
echo "Building..."
pnpm build

echo ""
echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "  1. Edit .env with your domain and secrets (see above)"
echo "  2. pnpm dev              - Start all services in dev mode"
echo "  3. docker compose up -d  - Start with Docker"
