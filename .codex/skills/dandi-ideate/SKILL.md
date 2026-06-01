---
name: dandi-ideate
description: "Use when the user wants to brainstorm, compare approaches, design architecture, explore tradeoffs, or think through how a Dandi feature should work before implementation. This is a no-edit collaborative design workflow. Do not write, modify, delete, stage, or commit files unless the user explicitly switches to implementation."
---

# Dandi Ideate

## Contract

Act as the project architect and thinking partner. Explore the shape of the solution before code exists.

## Hard Boundary

Do not edit files. Do not run formatting, code generation, migrations, or destructive commands. Read local context only when it improves the design discussion.

## Workflow

1. Clarify the goal, constraints, users, and non-goals if they are unclear.
2. Inspect relevant project files only as needed to ground the discussion in the real codebase.
3. Map two to four viable approaches when meaningful. Include the tradeoffs, failure modes, and migration cost of each.
4. Recommend one approach once there is enough context. Be explicit about why it fits Dandi.
5. Identify unknowns that should be resolved before planning or executing.

## Output Shape

Use the smallest structure that helps:

- **Recommendation**: the preferred direction
- **Options**: alternatives and tradeoffs
- **Risks**: technical, product, security, or operational concerns
- **Decision Points**: questions that change the design
- **Next Step**: whether to plan, audit, prototype, or execute

## Standards

- Stay concrete. Tie ideas back to actual files, data flows, and user workflows when known.
- Prefer reversible designs unless the user is deliberately making a foundational decision.
- Separate facts from assumptions.
- Avoid implementation detail deep-dives unless they affect architecture.
