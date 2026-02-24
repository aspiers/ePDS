#!/bin/bash
set -euo pipefail

# ── Utility functions ──

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

# Read a var=value from a file, returning just the value.
# Returns empty string if not found or value is empty.
read_env_var() {
  local var="$1" file="$2"
  grep -E "^${var}=" "$file" 2>/dev/null | head -1 | cut -d'=' -f2-
}

# Set a var in a file. Replaces the line if the var exists (commented or not),
# otherwise appends.
set_env_var() {
  local var="$1" val="$2" file="$3"
  if grep -qE "^#?\s*${var}=" "$file" 2>/dev/null; then
    sed_inplace "s|^#\?\s*${var}=.*|${var}=${val}|" "$file"
  else
    echo "${var}=${val}" >> "$file"
  fi
}

# Generate random values for vars that are currently set to bare "=".
# Usage: generate_secrets_in_file <file> VAR1 VAR2 ...
generate_secrets_in_file() {
  local file="$1"; shift
  for var in "$@"; do
    local secret
    secret=$(generate_secret)
    sed_inplace "s|^${var}=$|${var}=${secret}|" "$file"
    echo "  Generated $var"
  done
}

# Copy shared vars from the top-level .env into a per-package .env.
inject_shared_vars() {
  local target="$1"
  for var in PDS_HOSTNAME PDS_PUBLIC_URL EPDS_CALLBACK_SECRET EPDS_INTERNAL_SECRET PDS_ADMIN_PASSWORD; do
    local val
    val=$(read_env_var "$var" .env)
    if [ -n "$val" ]; then
      set_env_var "$var" "$val" "$target"
    fi
  done
}

# Inject derived vars that depend on the hostname into a per-package .env.
# Only sets vars that already exist in the target file.
inject_derived_vars() {
  local target="$1"

  local auth_hostname pds_hostname
  auth_hostname=$(read_env_var AUTH_HOSTNAME .env)
  pds_hostname=$(read_env_var PDS_HOSTNAME .env)

  if grep -qE "^AUTH_HOSTNAME=" "$target" 2>/dev/null && [ -n "$auth_hostname" ]; then
    set_env_var AUTH_HOSTNAME "$auth_hostname" "$target"
  fi
  if grep -qE "^EPDS_LINK_BASE_URL=" "$target" 2>/dev/null && [ -n "$auth_hostname" ]; then
    set_env_var EPDS_LINK_BASE_URL "https://${auth_hostname}/auth/verify" "$target"
  fi
  if grep -qE "^SMTP_FROM=" "$target" 2>/dev/null && [ -n "$pds_hostname" ]; then
    set_env_var SMTP_FROM "noreply@${pds_hostname}" "$target"
  fi
  if grep -qE "^PDS_EMAIL_FROM_ADDRESS=" "$target" 2>/dev/null && [ -n "$pds_hostname" ]; then
    set_env_var PDS_EMAIL_FROM_ADDRESS "noreply@${pds_hostname}" "$target"
  fi
}

# ── Interactive prompts ──

# Ask for the PDS hostname and derive all other hostnames/URLs from it.
# Runs only when creating a new .env (not on re-runs).
prompt_hostname() {
  echo "Configure your ePDS instance"
  echo "──────────────────────────────"
  echo ""
  echo "Enter your PDS hostname. This is the domain your PDS will be"
  echo "reachable at. User handles will be <random>.<hostname>."
  echo ""
  echo "Examples:"
  echo "  pds.example.com          (production)"
  echo "  localhost                 (local dev without TLS)"
  echo ""

  local pds_hostname
  read -rp "PDS hostname: " pds_hostname
  if [ -z "$pds_hostname" ]; then
    echo "No hostname entered, using 'localhost'."
    pds_hostname="localhost"
  fi

  local auth_hostname
  if [ "$pds_hostname" = "localhost" ]; then
    auth_hostname="localhost"
  else
    auth_hostname="auth.${pds_hostname}"
  fi

  echo ""
  echo "Auth hostname will be: ${auth_hostname}"
  echo ""

  local proto="https"
  if [ "$pds_hostname" = "localhost" ] || [[ "$pds_hostname" == *.localhost ]]; then
    proto="http"
  fi

  local pds_public_url="${proto}://${pds_hostname}"
  if [ "$pds_hostname" = "localhost" ]; then
    pds_public_url="http://localhost:3000"
  fi

  set_env_var PDS_HOSTNAME "$pds_hostname" .env
  set_env_var PDS_PUBLIC_URL "$pds_public_url" .env
  set_env_var AUTH_HOSTNAME "$auth_hostname" .env
  set_env_var EPDS_LINK_BASE_URL "${proto}://${auth_hostname}/auth/verify" .env
  set_env_var SMTP_FROM "noreply@${pds_hostname}" .env
  set_env_var PDS_EMAIL_FROM_ADDRESS "noreply@${pds_hostname}" .env

  echo "  Set PDS_HOSTNAME=${pds_hostname}"
  echo "  Set PDS_PUBLIC_URL=${pds_public_url}"
  echo "  Set AUTH_HOSTNAME=${auth_hostname}"
  echo "  Set EPDS_LINK_BASE_URL=${proto}://${auth_hostname}/auth/verify"
  echo "  Set SMTP_FROM=noreply@${pds_hostname}"
  echo "  Set PDS_EMAIL_FROM_ADDRESS=noreply@${pds_hostname}"
}

prompt_demo() {
  echo ""
  echo "Configure the demo app (optional)"
  echo "──────────────────────────────────"
  echo ""
  echo "The demo app needs to know its own public URL and where to find"
  echo "the PDS and auth service. Press Enter to accept defaults."
  echo ""

  local pds_public_url auth_hostname proto
  pds_public_url=$(read_env_var PDS_PUBLIC_URL .env)
  auth_hostname=$(read_env_var AUTH_HOSTNAME .env)
  proto="https"
  if [[ "$pds_public_url" == http://* ]]; then
    proto="http"
  fi

  local default_demo_url="http://127.0.0.1:3002"
  local default_auth_endpoint="${proto}://${auth_hostname}/oauth/authorize"
  if [ "$auth_hostname" = "localhost" ]; then
    default_auth_endpoint="http://localhost:3001/oauth/authorize"
  fi

  local demo_url
  read -rp "Demo public URL [${default_demo_url}]: " demo_url
  demo_url="${demo_url:-$default_demo_url}"

  set_env_var PUBLIC_URL "$demo_url" packages/demo/.env
  set_env_var PDS_URL "$pds_public_url" packages/demo/.env
  set_env_var AUTH_ENDPOINT "$default_auth_endpoint" packages/demo/.env

  echo ""
  echo "  Set PUBLIC_URL=${demo_url}"
  echo "  Set PDS_URL=${pds_public_url}"
  echo "  Set AUTH_ENDPOINT=${default_auth_endpoint}"
}

# ── Setup stages ──

check_prerequisites() {
  for cmd in pnpm openssl node; do
    if ! command -v "$cmd" &>/dev/null; then
      echo "ERROR: $cmd is required but not installed."
      exit 1
    fi
  done
  echo "Node version: $(node --version)"
  echo "pnpm version: $(pnpm --version)"
  echo ""
}

setup_toplevel_env() {
  if [ -f .env ]; then
    echo ".env already exists, skipping generation."
    return
  fi

  echo "Creating .env from .env.example..."
  cp .env.example .env

  generate_secrets_in_file .env \
    PDS_JWT_SECRET PDS_DPOP_SECRET AUTH_SESSION_SECRET AUTH_CSRF_SECRET \
    PDS_ADMIN_PASSWORD EPDS_CALLBACK_SECRET EPDS_INTERNAL_SECRET

  echo ""
  prompt_hostname

  echo ""
  echo "You still need to configure:"
  echo "  1. PDS_PLC_ROTATION_KEY_K256_PRIVATE_KEY_HEX - Generate with:"
  echo "     openssl ecparam -name secp256k1 -genkey -noout | openssl ec -text -noout 2>/dev/null | grep priv -A 3 | tail -n +2 | tr -d '[:space:]:'"
  echo "  2. SMTP settings        - For email delivery (see .env)"
}

# Create a per-package .env from its .env.example, inject shared/derived vars,
# and generate any package-specific secrets.
# Usage: setup_package_env <pkg_dir> [SECRET_VAR ...]
setup_package_env() {
  local pkg_dir="$1"; shift
  local env_file="${pkg_dir}/.env"

  if [ -f "$env_file" ]; then
    echo "${env_file} already exists, skipping."
    return
  fi

  echo "Creating ${env_file}..."
  cp "${pkg_dir}/.env.example" "$env_file"
  inject_shared_vars "$env_file"
  inject_derived_vars "$env_file"

  if [ $# -gt 0 ]; then
    generate_secrets_in_file "$env_file" "$@"
  fi
}

setup_package_envs() {
  # Each package has its own .env.example. Per-package .env files are used by:
  #   - pnpm dev:demo (Next.js loads packages/demo/.env automatically)
  #   - Railway (each service reads only its own vars — copy-paste into raw editor)
  # For docker-compose and pnpm dev (core + auth), the top-level .env is sufficient.

  echo ""
  setup_package_env packages/pds-core PDS_JWT_SECRET PDS_DPOP_SECRET
  setup_package_env packages/auth-service AUTH_SESSION_SECRET AUTH_CSRF_SECRET

  # Demo needs special handling: SESSION_SECRET line is commented out by default
  if [ ! -f packages/demo/.env ]; then
    echo "Creating packages/demo/.env..."
    cp packages/demo/.env.example packages/demo/.env
    local secret
    secret=$(generate_secret)
    sed_inplace "s|^# SESSION_SECRET=.*|SESSION_SECRET=${secret}|" packages/demo/.env
    echo "  Generated SESSION_SECRET"
    prompt_demo
  else
    echo "packages/demo/.env already exists, skipping."
  fi

  echo ""
  echo "See per-package .env.example files for full documentation:"
  echo "  packages/pds-core/.env.example"
  echo "  packages/auth-service/.env.example"
  echo "  packages/demo/.env.example"
}

print_next_steps() {
  echo ""
  echo "=== Setup complete ==="
  echo ""
  echo "Next steps:"
  echo "  1. Review .env files and adjust if needed"
  echo "  2. pnpm install && pnpm build"
  echo "  3. pnpm dev              - Start core + auth in dev mode"
  echo "  4. pnpm dev:demo         - Start the demo app (separate terminal)"
  echo "  5. docker compose up -d  - Or start with Docker instead"
}

# ── Main ──

main() {
  echo "=== ePDS Setup ==="
  echo ""
  check_prerequisites
  setup_toplevel_env
  setup_package_envs
  print_next_steps
}

main "$@"
