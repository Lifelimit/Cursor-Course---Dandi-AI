<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Rules
- Always use **Yarn** (`yarn`) for package management and script execution. Do not use `npm`.
- Before pushing to GitHub, always run `yarn lint` and `yarn typecheck`. Do not push if either command fails; fix the issue first or explicitly report the blocker.

## Hidden Routes
- `/protected` — Auth-gated Vault page for API key validation testing. Not linked from any UI navigation. Access by URL only.
