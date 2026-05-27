<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Rules
- Always use **Yarn** (`yarn`) for package management and script execution. Do not use `npm`.

## Hidden Routes
- `/protected` — Auth-gated Vault page for API key validation testing. Not linked from any UI navigation. Access by URL only.

