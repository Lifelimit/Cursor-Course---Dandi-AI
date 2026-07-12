# External workflow validation

Date: 2026-07-12
Status: Partially validated; end-to-end approval still required

Safe, non-mutating checks completed from the local environment:

- Stripe test API account metadata request succeeded. No customer, payment,
  invoice, or subscription mutation was performed.
- Google Generative Language model-list request succeeded. No generation was
  started.
- Supabase Auth settings endpoint responded successfully and reported the
  configured email and Google providers.
- GitHub's anonymous public README endpoint responded successfully with rate
  limit headroom. No private repository or installation token was used.
- The production webhook worker was verified locally for both missing-secret
  (`503`) and invalid-bearer (`401`) behavior.

The following remain unverified because the environment has no safe test user,
GitHub token, configured cron secret, usable SMTP password, or approved webhook
receiver target:

- authenticated login/signup/recovery and the complete authenticated product
  journeys;
- private GitHub Summary and GitHub App authorization;
- live Dandi AI generation, repository preparation, and grounded Ask;
- email confirmation and password-recovery delivery;
- Stripe checkout, invoices, payment methods, and subscription transitions;
- delivery to a real receiver and retry/circuit behavior against it.

These require explicit test credentials/targets and should be run in a
non-production environment with side effects isolated from real users.

## Repeatable readiness check

Run `yarn external:readiness` to inspect the configured environment without
printing secret values. It exits with code `2` when read-only prerequisites are
missing. Add `--probe` (or set `DANDI_RUN_EXTERNAL_PROBES=1`) to run only the
safe read-only Stripe account, Google model-catalog, Supabase Auth settings,
GitHub public README, local CSP, and worker-auth probes. The script never runs
checkout, payment-method, email, AI-generation, repository-ingestion, or
webhook-delivery mutations.

Set `DANDI_BASE_URL` explicitly when the local or deployed app should also be
probed; the script does not infer a target from `NEXT_PUBLIC_APP_URL`.
The worker probe treats `503` (not configured) or `401` (configured but no
bearer supplied) as the expected unauthenticated boundary response.

Live workflow validation remains a separate, explicitly approved step requiring
isolated credentials and targets.
