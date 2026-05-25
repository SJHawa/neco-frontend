## Entry: 2026-05-25 Task 5

**Track:**
- Plan file: `docs/plans/common-sequential-plan.md`
- Task: `Task 5: Implement current-room and invitation initialization`
- Dependencies reviewed:
  - `docs/implementation-logs/README.md`
  - `docs/implementation-logs/common/README.md`
  - `docs/implementation-logs/common/phase-2-auth.md` Task 4 entry
  - `docs/specs/02-domain-model.md`
  - `docs/specs/04-api-and-auth.md`
  - `docs/specs/07-state-and-client-data.md`
  - `docs/specs/08-error-loading-and-navigation.md`
  - `docs/specs/09-testing-and-milestones.md`
  - `docs/plans/common-sequential-plan.md`

**What was done:**
- Added `gameRoomApi` and `invitationApi` modules for `/main` initialization using `GET /game-rooms?userId=...` and `GET /game-room-participants?userId=...&status=INVITED`.
- Added `resolveCurrentGameRoomState()` so `GET /game-rooms` is interpreted as a zero-or-one current-room query, with duplicate-room warning behavior that prefers the most recently updated room and logs the anomaly.
- Replaced the `/main` placeholder with the first real initialization UI: image-aligned full-screen layout, guide sidebar, assistant-area loading skeleton, retryable error state, empty prompt, current-room summary, and invitation cards.
- Split current-room and invitation hydration into separate TanStack Query requests after `gpt-5.4` review feedback, so one failed request no longer discards the other successful result.
- Persisted current-room, duplicate warning, and invitation results into the shared room slice, and updated logout/reset handling so room initialization data is cleared with the auth session.
- Added regression tests for request URL construction, current-room interpretation, duplicate warning behavior, loading/ready/error view derivation, partial-failure handling, and logout reset behavior.

**Why it matters for the next worker:**
- Task 6 can build AI chat session/message hydration on top of a real `/main` boot flow without re-solving current-room or invitation contracts.
- Worker 1 now has a stable `/main` shell and room/invitation state shape to extend into AI chat interactions and waiting-room UI.

**Dependency impact:**
- Completed the first half of Phase 3 by making `/main` hydrate authoritative current-room and invitation state from the backend.
- Reduced downstream auth-state leakage by resetting room initialization data on logout instead of leaving stale room/invitation state in memory.

**Files touched:**
- `src/app/providers/ClientStateProvider.tsx`
- `src/app/store/clientState.ts`
- `src/features/game-room/*`
- `src/features/invitation/*`
- `src/pages/MainPage/*`
- `src/shared/styles/global.css`
- `src/shared/types/clientState.ts`
- `tests/app/mainInitialization.test.mjs`

**Commit:**
- `e0c91b3`

**Verification completed:**
- [x] Task 5 implementation review against `docs/specs/02-domain-model.md`, `docs/specs/04-api-and-auth.md`, `docs/specs/07-state-and-client-data.md`, `docs/specs/08-error-loading-and-navigation.md`, and `docs/specs/09-testing-and-milestones.md`
- [x] `npm test`
- [x] `npm run build`
- [x] Independent `gpt-5.4` subagent review after implementation, with the query-splitting and logout-reset findings incorporated before the code commit

**Not verified:**
- [ ] Browser-level manual `/main` smoke test against a running app instance
- [ ] DOM/component or route-level integration test for the real React Query + Zustand + rendered MainPage wiring

**Design decisions:**
- Kept Task 5 scoped to read-only initialization: current-room and invitation state hydrate into `/main`, while actual AI chat send/session/message behavior remains for Task 6.
- Represented duplicate-room handling in the shared room slice with `duplicateRoomWarning` so later `/main` work can surface or clear that anomaly without re-deriving it.
- Used separate queries for current room and invitations so retry and partial-success behavior matches the server-state ownership described in the spec.

**Deviations from spec:**
- No intentional contract deviation. The implementation follows the single-current-room interpretation, `INVITED` invitation filter, loading/error policy, and `/main` stay-in-place navigation rules from the spec set.

**Trade-offs:**
- Added pure view-derivation tests instead of introducing a DOM/component harness during Task 5, which kept the diff smaller but leaves the actual rendered query/store wiring indirectly covered.
- Chose a disabled composer UI for `/main` so the page visually matches the product direction without prematurely implementing Task 6 AI message submission.

**Open questions:**
- [ ] The repo still lacks a DOM/component integration harness for MainPage-level query/render flows; decide whether Task 6 should introduce one or defer to the Phase 8 QA milestone.
- [ ] Browser-level manual smoke coverage for `/main` remains unresolved.
- [x] Initial Task 5 implementation coupled current-room and invitation fetches into one all-or-nothing query → fixed by splitting them into separate queries after review
- [x] Logout previously left room initialization data in memory → fixed by resetting the full app store on logout/session failure

**Instructions for the next worker:**
- Read `src/pages/MainPage/mainInitialization.ts`, `src/pages/MainPage/index.tsx`, and this log before adding AI chat session/message hydration.
- Preserve the `room` slice contract: `currentRoom`, `duplicateRoomWarning`, `invitations`, and `roomWaitingState`.
- Keep `/main` initialization read-only until Task 6 adds AI chat session/message loading; do not re-couple current-room and invitation fetches when extending the page.
