# Implementation Logs Guide

## Purpose

This directory stores handoff-oriented implementation logs aligned to the worker split defined in:

- `docs/plans/common-sequential-plan.md`
- `docs/plans/worker-1-main-chat-and-waiting-room-plan.md`
- `docs/plans/worker-2-gameplay-and-realtime-plan.md`

Use this directory when actual implementation starts. The common track captures work that must happen before parallel execution, and the worker folders capture task-by-task handoff records for each parallel stream.

## Directory Layout

- `docs/implementaion-logs/common/`
  - Logs for the sequential prerequisite track from `common-sequential-plan.md`
- `docs/implementaion-logs/worker-1/`
  - Logs for `/main` AI chat, invitation, and waiting-room work
- `docs/implementaion-logs/worker-2/`
  - Logs for gameplay, editor, hint, and realtime work

## Required Workflow

Before starting work:

1. Read this file.
2. Read the relevant plan file for your track.
3. Confirm that every dependency task listed in that plan is complete.
4. Read the latest log entries in:
   - your own track folder
   - the upstream dependency folder if your task depends on another track
5. Check the most recent log entry for unresolved open questions. If any item remains `[ ]`, stop and resolve it before continuing.

After finishing a task:

1. Verify the task using the acceptance and verification items in the plan.
2. Create exactly one commit for that completed task before starting the next task.
3. Append exactly one new log entry in the correct track folder.
4. Record what changed, what was verified, what was intentionally not verified, and what the next worker must know.

## Log File Rules

- Use `common/` for tasks from `common-sequential-plan.md`.
- Use `worker-1/` for tasks from `worker-1-main-chat-and-waiting-room-plan.md`.
- Use `worker-2/` for tasks from `worker-2-gameplay-and-realtime-plan.md`.
- Prefer one markdown file per plan phase inside each folder.
- If a phase grows too large, split by task range.

Recommended file names:

- `common/phase-1-foundation.md`
- `common/phase-2-auth.md`
- `common/phase-3-main-initialization.md`
- `worker-1/phase-4a-ai-chat.md`
- `worker-1/phase-4b-waiting-room.md`
- `worker-2/phase-6a-route-and-socket.md`
- `worker-2/phase-6b-core-gameplay.md`
- `worker-2/phase-7-turn-and-result.md`

## Log Entry Template

```md
## Entry: 2026-05-19 Task N

**Track:**
- Plan file: `docs/plans/...`
- Task: `Task N: ...`
- Dependencies reviewed:
  - `Task ...`
  - `Previous log entry ...`

**What was done:**
- [Short factual summary]
- [Short factual summary]

**Why it matters for the next worker:**
- [Contract, invariant, or behavior that future tasks depend on]
- [Constraint or caveat that should not be rediscovered]

**Dependency impact:**
- [What dependency was satisfied, changed, or introduced]
- [What downstream task is affected]

**Files touched:**
- `path/to/file`
- `path/to/test`

**Commit:**
- `abcdef1`

**Verification completed:**
- [ ] [Concrete test, check, or review that passed]

**Not verified:**
- [ ] [Anything intentionally left unverified]

**Design decisions:**
- [Choice made where the spec was silent or ambiguous, and the rationale]

**Deviations from spec:**
- [Intentional divergence and why]

**Trade-offs:**
- [Alternative considered and why the chosen approach won]

**Open questions:**
- [ ] [Unresolved item that blocks or may affect the next task]
- [x] [Resolved item] → [How it was resolved]

**Instructions for the next worker:**
- [What to read first]
- [What must be preserved]
```

## Coordination Rules

- Worker 1 and Worker 2 can proceed in parallel only after the common track reaches the `Parallel Split Ready` checkpoint.
- If either worker changes a shared contract after the split, record that change in the worker log and mirror the impact in the other worker's next log review.
- When plan, log, and spec disagree, follow this order:
  1. current user instruction
  2. `docs/specs/`
  3. `docs/plans/`
  4. existing logs

## Minimum Handoff Rule

If a task changed behavior, contracts, state shape, routing assumptions, or verification expectations, the next worker must be able to continue by reading the plan file plus the latest relevant log entry without reopening the full diff first.
