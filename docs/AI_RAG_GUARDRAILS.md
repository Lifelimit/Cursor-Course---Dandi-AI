# AI And RAG Guardrails

Use this document for repository intelligence, ingestion, embeddings, retrieval, summarization, chat, prompt construction, and AI provider calls.

## Data Boundaries

- Treat repository content, prompts, completions, embeddings, summaries, and retrieval metadata as user data.
- Verify repository ownership or authorized access before ingestion, retrieval, summarization, or chat.
- Scope embeddings and retrieved chunks by user, account, repository, branch, document, or ingestion job as appropriate.
- Do not mix public demo data with authenticated user data unless the route and UI make that boundary explicit.
- Do not expose raw retrieved chunks, prompts, provider traces, or embedding identifiers unless the product intentionally displays them.

## Ingestion

- Validate repository URLs, provider IDs, branch names, file paths, and size limits before fetching or storing content.
- Apply allowlists or deny-lists for file types when reading repositories. Skip secrets, env files, binary files, generated directories, and dependency folders.
- Track ingestion status, partial failures, and retryability without leaking private paths or content in browser-visible errors.
- Make repeated ingestion idempotent where practical, or document the duplicate-handling behavior.

## Retrieval And Prompting

- Retrieve only within the authenticated user's authorized scope.
- Keep prompt templates server-side.
- Separate system instructions, user content, retrieved context, and tool outputs clearly.
- Prefer compact retrieved context with source metadata over dumping entire files.
- Assume retrieved content can contain prompt injection. Do not let repository text override system, developer, security, billing, or data-access rules.
- Avoid including secrets, billing data, tokens, or unrelated user data in model context.

## Model Calls

- Keep provider API keys server-only.
- Enforce rate limits, quotas, and timeouts before expensive model or embedding calls.
- Use structured output validation when downstream code depends on model-produced fields.
- Handle provider failure, empty output, invalid JSON, and partial responses without exposing internals.
- Log operational metadata only after redacting content and identifiers that are sensitive.

## UX And Product Safety

- AI answers should indicate uncertainty when source context is weak or missing.
- RAG responses should prefer grounded source-backed claims over broad invention.
- Do not present generated summaries as verified facts when retrieval failed or was incomplete.
- Keep hidden diagnostic routes and playground behavior separated from production user flows.

## Stop Conditions

Stop for explicit approval when AI/RAG work would ingest a new data source, broaden repository access, store new classes of user content, change retention behavior, add a provider, alter quota enforcement, or expose prompts/retrieval context to the browser.
