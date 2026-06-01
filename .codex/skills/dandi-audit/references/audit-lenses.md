# Dandi Audit Lenses

Use the relevant lenses for the requested scope. Do not force every lens into the final answer; report only issues that matter.

## Security And Privacy

- Auth checks cannot be bypassed through server actions, route handlers, middleware, client assumptions, or direct Supabase calls.
- Secrets stay server-side and are not exposed through client bundles, logs, errors, or public env vars.
- Inputs are validated at trust boundaries.
- Redirects, file paths, and query params cannot be abused.

## Supabase And RLS

- RLS policies enforce tenant/user boundaries independently of UI checks.
- Server-side code uses the correct Supabase client for the trust level.
- Mutations cannot update rows outside the authenticated user's allowed scope.
- Reads do not leak private rows through joins, counts, storage URLs, or error messages.

## Correctness

- Loading, empty, error, and partial-data states are handled.
- Async work handles cancellation, stale data, retries, and race conditions where relevant.
- Date/time, currency, locale, and pagination logic behave at boundaries.
- Types match runtime data rather than only satisfying TypeScript.

## Performance

- Avoid unnecessary waterfalls, repeated queries, large client bundles, and unbounded list rendering.
- Cache behavior is intentional for the current Next.js version.
- Expensive work is not repeated per request or render without need.

## Resource Management

- Subscriptions, timers, streams, event listeners, and async handles are cleaned up.
- Long-running operations have failure handling and do not leave inconsistent state.

## Frontend UX

- UI works on mobile and desktop without overlapping text or layout shifts.
- Controls have expected disabled, pending, focus, and error states.
- User-facing copy is specific and does not expose implementation details.

## Maintainability

- Responsibilities stay near existing module boundaries.
- New abstractions reduce real duplication or complexity.
- Naming, types, and component boundaries match local conventions.

## Tests And Observability

- Critical behavior has focused tests or a clear validation path.
- Errors are observable without leaking sensitive data.
- Logs and telemetry, if present, are useful and appropriately scoped.
