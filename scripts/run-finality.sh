#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f x402-server/.env ]]; then
  echo "Missing x402-server/.env. Run: cp .env.example x402-server/.env"
  exit 1
fi

if [[ ! -f .env.local ]]; then
  echo "Missing .env.local. Run: cp .env.example .env.local"
  exit 1
fi

merchant_pid=""
frontend_pid=""

cleanup() {
  [[ -n "$merchant_pid" ]] && kill "$merchant_pid" 2>/dev/null || true
  [[ -n "$frontend_pid" ]] && kill "$frontend_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting Finality merchant API at http://localhost:4021"
npm run dev:x402 &
merchant_pid=$!

echo "Starting Finality frontend at http://localhost:3000"
npm run dev &
frontend_pid=$!

wait "$merchant_pid" "$frontend_pid"
