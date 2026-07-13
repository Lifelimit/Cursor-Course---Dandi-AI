# Dandi password recovery

Dandi uses Supabase Auth with the `@supabase/ssr` PKCE flow. A recovery request sends the user to the server callback, which exchanges the one-time code and then redirects to `/auth/reset-password`. The reset page only enables the form after the callback marker, a browser `PASSWORD_RECOVERY` event, or a recovery URL fragment has produced a live session. After `updateUser`, the recovery marker is cleared and the existing signed-in session continues to the requested workspace destination.

## Supabase Auth URL configuration

In Supabase Dashboard → Authentication → URL Configuration, add the exact URLs below to Redirect URLs. Keep Site URL set to the production origin when managing the hosted project.

Local development:

- `http://localhost:3000/auth/callback`
- `http://localhost:3000/auth/reset-password`
- `http://127.0.0.1:3000/auth/callback`
- `http://127.0.0.1:3000/auth/reset-password`

Production, based on the repository’s documented Vercel deployment:

- `https://dandi-orcin.vercel.app/auth/callback`
- `https://dandi-orcin.vercel.app/auth/reset-password`

The production recovery destination is `https://dandi-orcin.vercel.app/auth/reset-password`.

Preview deployments do not have one stable origin in this repository. Do not add a broad `*.vercel.app` wildcard for password recovery. For a preview test, set that deployment’s `NEXT_PUBLIC_APP_URL` to its exact HTTPS origin and add these exact URLs to Supabase before testing:

- `https://<exact-preview-origin>/auth/callback`
- `https://<exact-preview-origin>/auth/reset-password`

Remove temporary preview URLs when they are no longer needed. The recovery callback is built from `NEXT_PUBLIC_APP_URL`; it is never hardcoded to a development origin.

## Email template configuration

Recovery email templates are not version-controlled in this repository. Configure them in the Supabase Dashboard only. Recommended subject: `Reset your Dandi password`. Keep the message neutral, branded as Dandi, explain that the link is single-use and time-limited, and include a clear button plus an accessible plain-text fallback using Supabase’s `{{ .ConfirmationURL }}` placeholder. Do not include account identifiers or passwords in the message.

Actual delivery depends on Supabase’s email service or configured custom SMTP. Production delivery should use a verified SMTP provider; the application’s unrelated SMTP variables do not configure Supabase Auth email delivery.
