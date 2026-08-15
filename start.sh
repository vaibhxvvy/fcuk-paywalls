#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

if ! command -v npm >/dev/null 2>&1; then
    echo "[X] npm not found. Install Node.js first: https://nodejs.org"
    exit 1
fi

if [ ! -d node_modules ]; then
    echo "[*] Installing dependencies..."
    npm install
fi

echo "[*] Starting dev server - the browser will open automatically..."
npm run dev -- --open