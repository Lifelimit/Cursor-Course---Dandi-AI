# GitHub App Installation Flow

Date: 2026-06-22
Status: Accepted

## Context

Dandi needs a real GitHub connection that can support repository-scoped private repository access later. The previous Account Settings integration state could be toggled locally and did not prove that GitHub authorization or repository grants existed.

GitHub setup URLs can include an `installation_id`, but GitHub warns that the query parameter can be spoofed. Dandi should not persist an installation record or use installation tokens only because a browser reached the setup callback with an ID.

## Decision

Use a GitHub App installation flow with a Dandi-generated state cookie, then require a GitHub App OAuth verification callback before storing the installation. The OAuth callback exchanges the temporary code for a user access token, verifies the repositories available to that GitHub user through the installation, then discards the user token and stores only installation metadata plus a verified repository snapshot.

Persist GitHub App installation metadata in `public.github_app_installations` with RLS policies bound to the authenticated Supabase user. Authenticated clients may only select their own rows; inserts, updates, and deletes happen only through trusted server routes that use the service-role client after verifying the current Supabase user. Do not store GitHub private keys, user access tokens, installation tokens, repository contents, or private file data in this table.

Account Settings displays only repositories returned by GitHub's user-token installation repositories endpoint during the verified connection flow. Dandi does not display installation-wide repository access unless a later owner/admin verification model is designed.

Superseded on 2026-07-12: the verified repository snapshot is display-only and must not authorize repository reads. Summary, Prepare, indexing, and chat are public-only unless a future Critical security decision introduces refreshable user authorization and private-data retention controls.

## Consequences

The Account Settings UI can show real connected/disconnected state and list repositories verified for the connecting GitHub user. Disconnect removes Dandi's local record only; users must manage or uninstall the app on GitHub for GitHub-side revocation.

The GitHub App must be configured with:

- `GITHUB_APP_ID`
- `GITHUB_APP_PRIVATE_KEY`
- `GITHUB_APP_CLIENT_ID`
- `GITHUB_APP_CLIENT_SECRET`
- `GITHUB_APP_SLUG` or `GITHUB_APP_INSTALLATION_URL`

The GitHub App callback URL should include `/api/integrations/github/callback`. If using the setup URL flow, the setup URL should also point at `/api/integrations/github/callback`.

## Alternatives Considered

Classic OAuth was rejected because it does not model repository-scoped installations as cleanly as GitHub Apps.

Persisting the setup `installation_id` directly was rejected because it would trust a spoofable callback parameter.

Using GitHub App installation access for private RAG/indexing/chat was deferred to avoid expanding authorization, retrieval, and data-retention assumptions without a separate review.
