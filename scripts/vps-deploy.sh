#!/usr/bin/env bash
# Runs on the VPS after the GitHub Action copies the repository.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$HOME/.nvm/nvm.sh"
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not on PATH for this SSH session." >&2
  exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "PM2 is not on PATH for this SSH session." >&2
  exit 1
fi

if [ ! -f .env.local ]; then
  echo "Create .env.local in $(pwd) before deploying. GitHub does not copy it." >&2
  exit 1
fi

npm ci
npm run build
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
