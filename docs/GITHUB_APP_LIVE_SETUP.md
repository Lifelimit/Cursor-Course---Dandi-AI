# GitHub App Live Setup

Use this checklist before running live verification of the Dandi GitHub App integration.

## GitHub App Configuration

Create or edit the GitHub App in GitHub developer settings.

- Homepage URL: `NEXT_PUBLIC_APP_URL`, for example `http://localhost:3000` locally or the deployed Dandi origin in production.
- Callback URL: `${NEXT_PUBLIC_APP_URL}/api/integrations/github/callback`.
- Request user authorization during installation: enabled.
- Device flow: disabled.
- Setup URL: leave blank when user authorization during installation is enabled. GitHub will redirect to the callback URL during the OAuth installation flow. If OAuth during installation is disabled for a future flow, use `${NEXT_PUBLIC_APP_URL}/api/integrations/github/callback` as the setup URL and enable redirect on update.
- Webhook: not required for the current Account Settings verification flow.

Required repository permissions:

- Metadata: read-only. GitHub Apps receive this permission by default and Dandi uses repository metadata for Account Settings display.
- Contents: read-only. This is required before future private repository summarization can read repository files, but summarization/indexing is intentionally not wired in the current verification task.

Repository access expectation:

- Prefer selected repositories while verifying.
- Account Settings displays only repositories that the connecting GitHub user can access through the installation.
- Dandi does not display organization-wide installation repositories unless a separate owner/admin verification model is added later.

## Environment Variables

Add these server-only values to `.env.local` for local verification:

```bash
GITHUB_APP_ID="123456"
GITHUB_APP_PRIVATE_KEY="<escaped PEM private key>"
GITHUB_APP_CLIENT_ID="Iv1.your-github-app-client-id"
GITHUB_APP_CLIENT_SECRET="your-github-app-client-secret"
GITHUB_APP_SLUG="your-github-app-slug"
```

`GITHUB_APP_INSTALLATION_URL` is optional. If omitted, Dandi builds the install URL from `GITHUB_APP_SLUG`:

```bash
GITHUB_APP_INSTALLATION_URL="https://github.com/apps/your-github-app-slug/installations/new"
```

Private key formatting:

- Keep the value server-only. Never prefix it with `NEXT_PUBLIC_`.
- Either use escaped newlines (`\n`) in one line or a quoted multiline value that your runtime loads correctly.
- The local service normalizes escaped newlines before signing the GitHub App JWT.

## Supabase Migration Setup

The linked Supabase project must have these migrations applied before the callback can persist a connection:

- `supabase/migrations/20260622_create_github_app_installations.sql`
- `supabase/migrations/20260622120000_harden_github_app_installations.sql`

After applying, verify:

- `public.github_app_installations` exists.
- RLS is enabled.
- `authenticated` has `SELECT` only.
- There are no authenticated `INSERT`, `UPDATE`, or `DELETE` policies.
- Trusted server routes use the service-role client to persist and remove local installation records after verifying the current Dandi user.

## Live Verification Checklist

1. Start Dandi with the real GitHub App env vars loaded.
2. Sign in to Dandi.
3. Open Account Settings, then Git Providers.
4. Click Connect GitHub.
5. Install or update the GitHub App for selected repositories.
6. Complete GitHub user authorization and return to `/api/integrations/github/callback`.
7. Confirm Account Settings shows connected state and real verified repositories.
8. Reload Account Settings and confirm connected state persists.
9. Use Reconnect to Refresh after changing repository grants on GitHub.
10. Click Remove from Dandi and confirm only the local Dandi record is removed.

Do not use this flow as proof that private repository summarization is ready. That requires a separate authorization design for resolving a Dandi user/API key to installation-token repository access.
