#!/usr/bin/env bash
# Launch the S3 Tables Observability Dynatrace app locally.
# Usage:  bash app/dev.sh
# First run opens a browser to sign in to https://hgd83841.apps.dynatrace.com (OAuth).
set -euo pipefail

# dt-app requires Node 24
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
echo "node $(node --version)"

cd "$(dirname "$0")"

# install deps if needed
if [ ! -d node_modules ]; then
  echo "installing dependencies..."
  npm install
fi

echo "starting dt-app dev server (a browser will open for Dynatrace sign-in)..."
exec npm run start
