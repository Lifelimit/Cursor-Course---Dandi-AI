# Dandi Plan Template

Use this template when the task spans multiple files, data models, auth boundaries, or user workflows.

## Objective

State the desired end state in one or two sentences.

## Assumptions

List assumptions that affect the plan. Mark anything that needs user confirmation.

## Phase Format

Each phase should include:

- Goal
- Files or areas likely involved
- Tasks
- Acceptance criteria
- Validation
- Stop condition

## Recommended Phase Order

1. Discovery: inspect current implementation, dependencies, and risks.
2. Data/Auth: schema, Supabase clients, RLS, policies, route protection, and migrations.
3. Backend: server actions, route handlers, validation, and data access helpers.
4. Frontend: UI states, forms, navigation, responsive behavior, and accessibility.
5. Tests: focused coverage for risky behavior and regression paths.
6. Verification: Yarn checks, manual flows, and any browser validation.
7. Cleanup: remove dead code, tighten names, update comments only where useful.

## Execution Prompt Format

```text
Use $dandi-execute to complete Phase N: <phase title>.

Context:
- <relevant design decision>
- <files or systems involved>

Tasks:
- <specific task>

Acceptance criteria:
- <observable result>

Validation:
- <commands or manual checks>
```
