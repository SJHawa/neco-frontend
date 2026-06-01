# Raw WebSocket Migration: Task 6 Doc Ownership Update

## Entry: 2026-06-01 Task 6

**Track:**
- Plan file: `docs/plans/2026-06-01-raw-websocket-migration-plan.md`
- Task: `Task 6: Update specs, plans, and implementation logs to reflect raw WebSocket ownership`
- Dependencies reviewed:
  - `docs/implementation-logs/raw-websocket-2026-06-01-task-1-contract-discovery.md`
  - `docs/implementation-logs/raw-websocket-2026-06-01-task-2-adapter-boundary.md`
  - `docs/implementation-logs/raw-websocket-2026-06-01-task-5-live-flow-revalidation.md`
  - `docs/specs/01-architecture.md`
  - `docs/specs/06-realtime-and-gameplay.md`
  - `docs/etc/api-spec.md`

**What was done:**
- Updated `docs/specs/01-architecture.md` so the source-of-truth architecture doc now describes raw `WebSocket` ownership, root-path connection behavior, first-message auth, and normalized `{ event, data }` envelopes.
- Updated `docs/specs/06-realtime-and-gameplay.md` so the realtime feature spec documents the transport envelope explicitly and keeps product events separated from low-level frame parsing.
- Updated the migration plan checklist for Task 6 to record that the spec and plan cleanup work is complete in this repository.
- Reviewed `docs/etc/api-spec.md` and left it unchanged because it already described the realtime contract as WebSocket-based rather than Socket.IO-based.

**Why it matters for the next worker:**
- Future workers can now treat `docs/specs/01-architecture.md` and `docs/specs/06-realtime-and-gameplay.md` as aligned with the migrated frontend transport instead of re-discovering the raw websocket contract from implementation logs.
- The documentation now preserves the product-level event vocabulary (`join-room`, `room-participants-updated`, `game-started`, etc.) while making it explicit that `shared/socket` owns `{ event, data }` parsing.
- The remaining open gap in this migration is live backend verification, not ambiguity about whether the frontend should still use Socket.IO.

**Dependency impact:**
- Satisfies Task 6 documentation work in `docs/plans/2026-06-01-raw-websocket-migration-plan.md`.
- Leaves Task 5 live QA items open; this entry does not change that runtime verification status.
- Narrows future documentation cleanup to lower-priority legacy docs outside `docs/specs/` if the team wants full terminology convergence later.

**Files touched:**
- `docs/specs/01-architecture.md`
- `docs/specs/06-realtime-and-gameplay.md`
- `docs/plans/2026-06-01-raw-websocket-migration-plan.md`
- `docs/implementation-logs/raw-websocket-2026-06-01-task-6-doc-ownership-update.md`

**Commit:**
- Not created in this session

**Verification completed:**
- [x] Manual doc review across `docs/specs/01-architecture.md`, `docs/specs/06-realtime-and-gameplay.md`, and `docs/etc/api-spec.md`
- [x] Final diff review confirmed the updated source-of-truth docs consistently describe raw websocket transport, first-message auth, and normalized `{ event, data }` envelopes

**Not verified:**
- [ ] Live backend QA for Task 5 remains incomplete
- [ ] Lower-priority legacy docs outside `docs/specs/` were not fully rewritten in this task

**Design decisions:**
- Treated `docs/specs/*` as the documentation source of truth per repository policy and kept the Task 6 diff local to those specs plus the active migration plan.
- Left `docs/etc/api-spec.md` unchanged because it already matched the backend websocket contract closely enough that editing it would have been churn without new behavior value.

**Deviations from spec:**
- None intentional. This task brought the source-of-truth specs into alignment with the already-migrated frontend transport contract.

**Trade-offs:**
- Not rewriting every historical planning document keeps the Task 6 diff small and reviewable, but some lower-priority legacy docs may still mention Socket.IO terminology until a broader doc sweep is requested.

**Open questions:**
- [ ] Should a later documentation cleanup task also normalize `docs/etc/tech-spec.md`, which still contains historical Socket.IO wording outside the current spec-first source-of-truth set?

**Instructions for the next worker:**
- Read this entry plus Task 5's log before doing any further realtime work.
- Preserve the distinction between transport-level `{ event, data }` envelopes in `shared/socket` and product-level event handling in `features/realtime`.
- Do not reintroduce handshake-time auth or `/socket.io` path assumptions unless the backend contract changes and is recaptured first.
