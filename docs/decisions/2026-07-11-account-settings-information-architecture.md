# Account settings information architecture

## Decision

The authenticated `/account` route uses a five-section workspace settings model:

- `profile` — Profile
- `github` — GitHub
- `api` — API access
- `webhooks` — Webhooks
- `security` — Security

Sections remain directly addressable through the `tab` query parameter, and client navigation uses `router.push(..., { scroll: false })` so browser back and forward continue to update the selected section.

## Query compatibility

| Previous value | Current value | Notes |
| --- | --- | --- |
| `profile` | `profile` | Preserved |
| `integrations` | `github` | Legacy GitHub/provider label maps to the GitHub section |
| `webhooks` | `webhooks` | Preserved |
| `security` | `security` | Preserved; API access is now independently available at `tab=api` |
| `api` | `api` | New direct address for API keys and telemetry |
| `github` | `github` | New canonical GitHub value |

The mapping is presentation-only. Existing authentication, API-key, GitHub App, webhook, telemetry, billing, and security behavior remains owned by the existing routes, hooks, and panels.
