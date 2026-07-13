#!/usr/bin/env bash
set -euo pipefail

export NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-https://example.supabase.co}"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-mock-anon-key}"
export NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:-pk_test_mock}"
export NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
export NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID="${NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID:-price_mock}"
export NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID="${NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID:-price_mock}"
export NEXT_PUBLIC_STRIPE_RESEARCHER_MONTHLY_PRICE_ID="${NEXT_PUBLIC_STRIPE_RESEARCHER_MONTHLY_PRICE_ID:-price_mock}"
export NEXT_PUBLIC_STRIPE_RESEARCHER_YEARLY_PRICE_ID="${NEXT_PUBLIC_STRIPE_RESEARCHER_YEARLY_PRICE_ID:-price_mock}"
export SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-mock-service-role}"
export STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY:-sk_test_mock}"
export STRIPE_WEBHOOK_SECRET="${STRIPE_WEBHOOK_SECRET:-whsec_mock}"
export UPSTASH_REDIS_REST_URL="${UPSTASH_REDIS_REST_URL:-https://mock.upstash.io}"
export UPSTASH_REDIS_REST_TOKEN="${UPSTASH_REDIS_REST_TOKEN:-mock-token}"
export GOOGLE_API_KEYS="${GOOGLE_API_KEYS:-mock-google-key}"
export API_KEY_HMAC_SECRET="${API_KEY_HMAC_SECRET:-mock-hmac-secret-key-32-chars-for-ci-pipeline-pass}"
# Optional delivery stays disabled during deterministic local/CI validation.
# Exporting the complete empty group also prevents a partial developer
# .env.local SMTP setup from making an otherwise isolated build nondeterministic.
export SMTP_HOST=""
export SMTP_PORT=""
export SMTP_USER=""
export SMTP_PASS=""
export SMTP_FROM=""

echo "[1/5] Checking Supabase migration lineage"
yarn migrations:check

echo "[2/5] Running ESLint"
yarn lint

echo "[3/5] Running TypeScript type generation and checking"
yarn typecheck

echo "[4/5] Running regression tests"
yarn test

echo "[5/5] Building the production application"
yarn build

echo "All local CI checks passed."
