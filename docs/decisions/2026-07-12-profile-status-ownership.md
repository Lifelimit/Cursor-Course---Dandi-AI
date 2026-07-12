# Profile integration status ownership

Date: 2026-07-12
Status: Accepted

The authenticated profile PATCH route accepts editable profile and webhook
configuration fields only. Integration status is server-owned and must not be
derived from a browser-supplied `githubConnected` value. Dashboard readiness
uses the verified GitHub installation lookup, while the profile route treats
the persisted status as read-only response metadata.

This prevents a client from writing a false integration state into its profile
record and keeps authorization decisions tied to the verified installation
boundary.
