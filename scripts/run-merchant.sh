#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f x402-server/.env ]]; then
  if [[ -f .env.local ]]; then
    cp .env.local x402-server/.env
    echo "Created x402-server/.env from .env.local"
  elif [[ -f x402-server/.env.example ]]; then
    cp x402-server/.env.example x402-server/.env
    echo "Created x402-server/.env from x402-server/.env.example — set BLOCKFROST_API_KEY and X402_PAYTO_ADDRESS"
  else
    echo "Missing x402-server/.env. Run: cp x402-server/.env.example x402-server/.env"
    exit 1
  fi
fi

# Keep merchant env aligned with root .env.local for shared keys
if [[ -f .env.local ]]; then
  for key in BLOCKFROST_API_KEY X402_PAYTO_ADDRESS X402_NETWORK X402_ASSET NETWORK BACKENDS; do
    root_val="$(grep -E "^${key}=" .env.local | tail -1 | cut -d= -f2- || true)"
    merch_val="$(grep -E "^${key}=" x402-server/.env | tail -1 | cut -d= -f2- || true)"
    if [[ -n "${root_val}" && -z "${merch_val}" ]]; then
      if grep -qE "^${key}=" x402-server/.env; then
        sed -i.bak "s|^${key}=.*|${key}=${root_val}|" x402-server/.env && rm -f x402-server/.env.bak
      else
        echo "${key}=${root_val}" >> x402-server/.env
      fi
      echo "Synced ${key} from .env.local → x402-server/.env"
    fi
  done
fi

# Prefer local merchant for Next proxy when developing
if grep -q '^X402_SERVER_URL=https://x402-server-w7qy.onrender.com' .env.local 2>/dev/null; then
  echo "Note: .env.local points X402_SERVER_URL at the Render merchant."
  echo "      For a local merchant, set X402_SERVER_URL=http://127.0.0.1:4021"
fi

bf="$(grep -E '^BLOCKFROST_API_KEY=' x402-server/.env | tail -1 | cut -d= -f2- || true)"
if [[ -z "${bf}" ]]; then
  echo "WARNING: BLOCKFROST_API_KEY is empty in x402-server/.env"
  echo "  Lace /pay/intent + localFacilitator settle need a Preprod Blockfrost project id."
  echo "  Create one at https://blockfrost.io → Preprod → set BLOCKFROST_API_KEY=preprod_..."
  echo "  (Merchant will still answer /health and HTTP 402 without it.)"
fi

echo "Starting Finality Cardano x402 merchant at http://localhost:4021"
echo "  x402: local package ./x402/srv (CIP-30 unsigned tx + localFacilitator)"
exec npm run dev:x402
