#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env.local ]]; then
  echo "Missing .env.local. Run: cp .env.example .env.local"
  exit 1
fi

echo "Starting Finality frontend at http://localhost:3000"
exec npm run dev
