# Webhook signing secret lifecycle

Date: 2026-07-12
Status: Accepted

## Context

Webhook signing secrets must be available to Dandi's server when it signs deliveries, but returning the stored plaintext value on every profile read leaves it in browser state indefinitely and makes a later compromise unnecessarily valuable. Users still need a reliable way to configure a receiver and recover from a lost or exposed secret.

## Decision

- Generate webhook signing secrets on the server from 32 cryptographically random bytes with the `whsec_dandi_` prefix.
- Return only `webhookSecretConfigured` and the final four characters during routine profile reads and unrelated profile updates.
- Disclose a full secret once when an endpoint first receives a secret, when the saved endpoint changes, or after an explicitly confirmed rotation.
- Rotate automatically when the endpoint changes so the previous receiver does not retain authority over future signatures.
- Keep the one-time value in separate ephemeral client state. Clear it on dismissal or any profile reload; never place it in the routine profile model.
- Require an authenticated, same-origin JSON POST with an explicit confirmation boolean for manual rotation. Scope all reads and writes to the authenticated user ID.
- Mark every response carrying secret metadata or a one-time secret as non-cacheable.
- Do not log secret values.

## Consequences

Existing secrets cannot be recovered from the account UI. A user who did not store the value must rotate it, then update the receiver. Rotation replaces the stored value immediately, so future deliveries signed with the new value will fail verification until the receiver is updated.

The server still stores the secret because outbound delivery signing requires it. Encrypting that column at rest would require a separate key-management design and migration and is outside this scoped change. A delivery that already loaded the previous secret immediately before a concurrent rotation may complete with that value; rotation governs subsequent reads.

## Alternatives Considered

- Continue returning a masked and copyable plaintext value: masking is only visual and does not reduce browser exposure.
- Store only a hash: Dandi must possess the original value to compute outbound HMAC signatures.
- Add application-level encryption now: worthwhile as a separate defense-in-depth project, but it introduces key rotation, recovery, and migration decisions beyond this lifecycle fix.
