#!/bin/bash
# Local CI Pre-Flight Validation Script for Dandi AI

# Set color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}         Dandi AI Local CI Validator              ${NC}"
echo -e "${BLUE}==================================================${NC}"

# 1. Run ESLint Linting checks
echo -e "\n${YELLOW}[1/3] Running ESLint check...${NC}"
yarn lint
LINT_EXIT=$?
if [ $LINT_EXIT -ne 0 ]; then
  echo -e "${RED}❌ Linting check failed! Please fix ESLint errors before committing.${NC}"
  exit $LINT_EXIT
fi
echo -e "${GREEN}✓ ESLint checks passed!${NC}"

# 2. Run TypeScript Typechecking
echo -e "\n${YELLOW}[2/3] Running TypeScript typecheck...${NC}"
yarn typecheck
TYPECHECK_EXIT=$?
if [ $TYPECHECK_EXIT -ne 0 ]; then
  echo -e "${RED}❌ TypeScript typecheck failed! Please resolve compiler errors before committing.${NC}"
  exit $TYPECHECK_EXIT
fi
echo -e "${GREEN}✓ TypeScript compiler checks passed!${NC}"

# 3. Run Production Build with Mock Variables
echo -e "\n${YELLOW}[3/3] Running Production Next.js Build...${NC}"
# Inject the required environment variables for building Next.js pages statically
export NEXT_PUBLIC_SUPABASE_URL="https://example.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="mock-anon-key"
export NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_mock"
export NEXT_PUBLIC_APP_URL="http://localhost:3000"
export NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID="price_mock"
export NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID="price_mock"
export NEXT_PUBLIC_STRIPE_RESEARCHER_MONTHLY_PRICE_ID="price_mock"
export NEXT_PUBLIC_STRIPE_RESEARCHER_YEARLY_PRICE_ID="price_mock"
export SUPABASE_SERVICE_ROLE_KEY="mock-service-role"
export STRIPE_SECRET_KEY="sk_test_mock"
export STRIPE_WEBHOOK_SECRET="whsec_mock"
export UPSTASH_REDIS_REST_URL="https://mock.upstash.io"
export UPSTASH_REDIS_REST_TOKEN="mock-token"
export GOOGLE_API_KEY="mock-google-key"
export DEMO_API_KEY="sk_live_demo_key_dandi_2026"
export NEXT_PUBLIC_DEMO_API_KEY="sk_live_demo_key_dandi_2026"
export API_KEY_HMAC_SECRET="mock-hmac-secret-key-32-chars-for-ci-pipeline-pass"

yarn build
BUILD_EXIT=$?
if [ $BUILD_EXIT -ne 0 ]; then
  echo -e "${RED}❌ Next.js production build failed! Please check page routes and components.${NC}"
  exit $BUILD_EXIT
fi

echo -e "\n${GREEN}==================================================${NC}"
echo -e "${GREEN}  🎉 All local CI pre-flight checks passed successfully!${NC}"
echo -e "${GREEN}     It is safe to commit and push changes.        ${NC}"
echo -e "${GREEN}==================================================${NC}"
