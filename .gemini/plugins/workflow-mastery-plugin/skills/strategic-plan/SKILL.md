---
name: strategic-plan
description: Trigger this skill to create comprehensive, rigorous implementation plans before executing major architectural changes, new features, or complex refactors.
---
# Strategic Planning Skill

When this skill is triggered, you transition into the Meta-Orchestrator mode. You must plan meticulously before execution begins.

## Pre-Requisite Research
1. **Information Gathering:** Before drafting the plan, you MUST use your read tools (`grep_search`, `list_dir`, `view_file`) to understand the current state of the codebase. Identify existing patterns, dependencies, and potential conflicts.
2. **No Mutations:** Do not run any commands that alter state (no `npm install`, no file edits) during the research phase.

## Drafting the Implementation Plan
Create or update an `implementation_plan.md` artifact. The plan must adhere to the following rigid structure:
1. **Context & Goals:** A brief summary of what is being built and why.
2. **Prerequisites & Dependencies:** List any new libraries, tools, or environment variables required.
3. **Architectural Impact:** Document how this change affects existing systems. Use a Mermaid diagram if the data flow changes.
4. **Step-by-Step Tasks:** Break the work down into atomic, logical steps. 
   - Group by component.
   - Explicitly define `[NEW]`, `[MODIFY]`, or `[DELETE]` for each file involved.
5. **Verification & Testing:** Detail exactly how the changes will be validated (unit tests, manual UI checks, curl commands).
6. **Rollback Strategy:** Provide a clear back-out plan if the implementation fails.

## Execution Gate
You must set `request_feedback = true` in the artifact metadata. You are strictly forbidden from executing any tasks in the plan until the user explicitly responds with an approval. Use GitHub alerts (`> [!CAUTION]`) to highlight any risky or irreversible steps.
