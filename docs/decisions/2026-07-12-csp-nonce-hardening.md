# CSP nonce hardening

Date: 2026-07-12
Status: Accepted

## Context

Production CSP removed `unsafe-eval` but still allowed `script-src 'unsafe-inline'`. The application uses Next framework scripts and Stripe.js, so removing that allowance requires request-scoped nonce propagation rather than a static header edit.

## Decision

- Generate a fresh cryptographic nonce in `proxy.ts` for each rendered request.
- Pass the nonce and CSP header through request headers so Next can attach it to framework scripts and inline payloads during server rendering.
- Use `script-src 'self' 'nonce-…' 'strict-dynamic'` in production and retain `unsafe-eval` only in development.
- Keep Stripe's `https://js.stripe.com` script origin and `https://hooks.stripe.com` frame origin explicitly allowed for Elements and SCA flows.
- Remove the static CSP from `next.config.ts` to avoid conflicting duplicate policies.
- Force request-time root rendering because Next nonce support is incompatible with static/ISR output.
- Migrate runtime animation `<style>` blocks to the global stylesheet so `style-src` can use the request nonce without `unsafe-inline`.
- Remove the remaining `style-src-attr` exception after moving data-driven progress, tooltip, menu, modal, and animation state into SVG attributes or external CSS classes.

## Consequences

Pages are dynamically rendered and lose static/CDN prerendering benefits, but framework inline scripts are no longer authorized by a reusable global script allowance. Stripe payment flows retain their required origins and need live Elements/SCA verification before deployment.

The application now emits no React `style` attributes or direct `.style` mutations in its app components; the policy can therefore reject style attributes outright while keeping nonce-bearing style blocks for framework output.
