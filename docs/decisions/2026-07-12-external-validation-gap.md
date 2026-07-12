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

## Email reconciliation

Dandi's application-email implementation is already present in
`lib/services/email.service.ts`. It sends application emails through
`nodemailer` using `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS`; this
is the SMTP integration intended to work with Resend SMTP. Existing callers
include API-key usage alerts and scheduled plan-change notifications.

Supabase Auth confirmation and recovery emails are a separate delivery path.
They are initiated through Supabase Auth and depend on Supabase Auth's own
SMTP configuration; they do not use Dandi's `nodemailer` service.

| Check | Status |
| --- | --- |
| Application-email implementation | Already present |
| Local live credentials | `SMTP_PASS` is a placeholder/unusable value |
| Vercel application SMTP credentials | Unverified; remote configuration has not been inspected |
| Supabase Auth SMTP | Unverified; the settings probe does not establish SMTP delivery configuration |
| Live delivery | Not yet validated |

The local placeholder is evidence about the local environment only. It does
not establish that Vercel application credentials or Supabase Auth SMTP are
missing. SMTP is not a deployment-startup prerequisite, so it should not block
deployment unless the current deployment explicitly requires email delivery
during startup or normal operation.

The following remain unverified because the environment has no safe test user,
GitHub token, live local SMTP credentials, or approved webhook receiver target;
Vercel SMTP credentials and Supabase Auth SMTP have not been inspected:

- authenticated login/signup/recovery and the complete authenticated product
  journeys;
- private GitHub Summary and GitHub App authorization;
- live Dandi AI generation, repository preparation, and grounded Ask;
- one isolated Dandi application email;
- Supabase Auth email confirmation or password-recovery delivery;
- Stripe checkout, invoices, payment methods, and subscription transitions;
- on-demand signed test delivery to a real receiver.

Automatic customer-event webhook delivery, retries, circuit breaking, and
persisted delivery history are deferred from the current launch scope.

These workflows require explicit test credentials/targets and should be run in
a non-production environment with side effects isolated from real users.

## Repeatable readiness check

Run yarn external:readiness to inspect the configured environment without
printing secret values. It exits with code 2 when read-only prerequisites are
missing. Add --probe (or set DANDI_RUN_EXTERNAL_PROBES=1) to run only the safe
read-only Stripe account, Google model-catalog, Supabase Auth settings, GitHub
public README, and local CSP probes. The script never runs checkout,
payment-method, email, AI-generation, repository-ingestion, or outbound
webhook mutations.

Set DANDI_BASE_URL explicitly when the local or deployed app should also be
probed; the script does not infer a target from NEXT_PUBLIC_APP_URL.

Live workflow validation remains a separate, explicitly approved step requiring
isolated credentials and targets.

## Remaining email actions after deployment is fixed

1. Verify that the Vercel environment contains the required application SMTP
   variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS`) using a
   redacted presence/status check; do not print secret values.
2. Inspect the Supabase Auth SMTP configuration without exposing credentials.
3. Send and verify one isolated application email, such as an API-key usage
   alert or scheduled plan-change notification.
4. Send and verify one isolated Supabase Auth recovery or confirmation email
   using a dedicated test account.

Record only the configuration status and test outcomes. Do not include SMTP
passwords, tokens, or message contents containing sensitive data in the
validation record.
