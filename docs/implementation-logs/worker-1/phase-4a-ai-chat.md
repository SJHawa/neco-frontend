## Entry: 2026-05-25 Task 1

**Track:**
- Plan file: `docs/plans/worker-1-main-chat-and-waiting-room-plan.md`
- Task: `Task 1: Implement AI chat message send and command branching`
- Dependencies reviewed:
  - `docs/implementation-logs/README.md`
  - `docs/implementation-logs/worker-1/README.md`
  - `docs/implementation-logs/common/phase-3-main-initialization.md` Task 6 entry
  - `docs/specs/05-ai-chat-flow.md`
  - `docs/specs/07-state-and-client-data.md`
  - `docs/specs/08-error-loading-and-navigation.md`
  - `docs/specs/09-testing-and-milestones.md`
  - `docs/plans/worker-1-main-chat-and-waiting-room-plan.md`

**What was done:**
- Added AI chat message send request/response types and `aiChatApi.sendMessage()` for `POST /ai-chat-sessions/{aiChatSessionId}/messages`.
- Added `aiChatMessage` helpers so the client appends returned `userMessage` and `assistantMessage`, deduplicates by `messageId`, and persists `pendingCommand` only while the backend command result remains `PENDING`.
- Replaced the disabled `/main` composer with a real send flow using React Query mutation, pending UI, retryable error UI, and local draft state.
- Switched rendered AI chat history on `/main` to the shared `aiChat` slice after hydration so send responses appear immediately without waiting for a remount.
- Refetched current-room, invitation, session, and message queries after successful sends so downstream Task 2 and Task 3 flows do not stay on stale `/main` data.
- Adjusted the no-active-session empty state so the page no longer tells the user to type into a disabled composer and instead shows a retryable session-missing state.
- Added regression tests for send request shape, command-result branching by `requestType` and `status`, and response-to-store synchronization.

**Why it matters for the next worker:**
- Task 2 can now build staged `ROOM_CREATE` UI on top of a working chat loop that already persists `pendingCommand` and response messages.
- The `/main` chat panel now has stable send/pending/error/retry behavior, so follow-up work can focus on command-specific rendering instead of transport/state plumbing.

**Dependency impact:**
- Satisfied Worker 1 Task 1 by wiring the interactive AI chat submission path on top of the Common Task 6 session/message initialization baseline.
- Introduced a reusable `syncSentAiChatResponse()` contract that downstream AI command UIs should keep using when they append follow-up responses.

**Files touched:**
- `src/features/ai-chat/aiChatApi.ts`
- `src/features/ai-chat/aiChatMessage.ts`
- `src/pages/MainPage/index.tsx`
- `src/shared/styles/global.css`
- `src/shared/types/domain.ts`
- `tests/app/aiChatInitialization.test.mjs`

**Commit:**
- `4f10ede`

**Verification completed:**
- [x] Manual contract review confirmed message submission sends only `{ message }` and does not reintroduce the removed `clientAction` field.
- [x] `npm test`
- [x] `npm run build`
- [x] Independent `gpt-5.4` subagent review after implementation, with follow-up fixes applied for stale post-send data refresh and the no-active-session empty-state mismatch
- [x] Planned unit coverage now exercises command-result branching by `requestType` and `status`

**Not verified:**
- [ ] Planned component test for chat input pending and error states because the repo still does not have a DOM/component test harness
- [ ] Browser-level manual `/main` smoke test against a running app instance

**Design decisions:**
- Kept `pendingCommand` persistence limited to `commandResult.status === PENDING`; successful or failed command results clear the pending state so staged UI does not inherit stale commands.
- Used the shared Zustand `aiChat` slice as the rendered message source after hydration so mutation responses can update the UI immediately without waiting for query cache invalidation.
- Refetched room, invitation, session, and message queries after successful sends instead of writing command-specific room/invitation mutations inside Task 1, which keeps Task 1 scoped to transport and state synchronization.

**Deviations from spec:**
- No intentional contract deviation for Task 1. Request shape, stored response fields, and send pending/error/retry handling follow the current spec set.

**Trade-offs:**
- Added helper-level regression coverage instead of introducing a new rendered component harness during Task 1, which kept the diff smaller but leaves pending/error DOM assertions for later QA work.
- Left staged `ROOM_CREATE` difficulty/template rendering for Task 2 even though Task 1 now stores the required backend state for it.

**Open questions:**
- [ ] Task 2 still needs to decide how to render `pendingCommand` and `assistantMessage.metadata.templates` on `/main` without breaking the chat history layout.
- [ ] Browser-level `/main` verification remains unresolved for the Worker 1 stream.
- [x] Initial review found stale room/invitation/session state after successful sends → fixed by refetching the dependent `/main` queries after mutation success
- [x] Initial review found the empty prompt could instruct the user to type into a disabled composer when no active session existed → fixed by replacing that copy with a retryable session-missing state

**Instructions for the next worker:**
- Read this entry, then open [index.tsx](/Users/imhyeon/Documents/GitHub/frontend/src/pages/MainPage/index.tsx) and [aiChatMessage.ts](/Users/imhyeon/Documents/GitHub/frontend/src/features/ai-chat/aiChatMessage.ts) before starting Task 2.
- Preserve the Task 1 guarantees: send only `{ message }`, append returned chat messages through `syncSentAiChatResponse()`, and keep `pendingCommand` scoped to active staged commands.
- Build staged `ROOM_CREATE` UI on top of the stored `pendingCommand` and assistant metadata instead of adding ad-hoc temporary state outside the shared `aiChat` slice.

## Entry: 2026-05-25 Task 2

**Track:**
- Plan file: `docs/plans/worker-1-main-chat-and-waiting-room-plan.md`
- Task: `Task 2: Implement ROOM_CREATE staged UI on /main`
- Dependencies reviewed:
  - `docs/implementation-logs/README.md`
  - `docs/implementation-logs/worker-1/phase-4a-ai-chat.md` Task 1 entry
  - `docs/specs/05-ai-chat-flow.md`
  - `docs/specs/08-error-loading-and-navigation.md`
  - `docs/specs/09-testing-and-milestones.md`
  - `docs/etc/api-spec.md` ROOM_CREATE example
  - `docs/plans/worker-1-main-chat-and-waiting-room-plan.md`

**What was done:**
- Added `roomCreateFlow` helpers that scope staged ROOM_CREATE metadata to the active pending request id instead of scanning the full chat history globally.
- Added difficulty-selection UI for `ROOM_CREATE` pending responses and template-selection UI for `assistantMessage.metadata.templates`, both rendered inline on `/main` inside the assistant area.
- Wired quick-action difficulty and template buttons to send natural-language follow-up messages through the existing chat send mutation instead of reintroducing any client-only action field.
- Added an interim waiting-room transition state so successful room creation immediately switches `/main` into waiting-room mode even before the current-room query fully catches up.
- Added retryable waiting-room sync handling when room creation succeeded but the current-room refetch still has not produced the authoritative room payload yet.
- Added regression tests for request-scoped template extraction, difficulty extraction, staged UI gating, and the natural-language follow-up builders.

**Why it matters for the next worker:**
- Task 3 can now build invitation accept/deny behavior on top of a stable command-rendering pattern instead of inventing a second staged-command UI path.
- The `/main` route now has an explicit waiting-room transition boundary after room creation, which Task 4 can replace with richer waiting-room status and participant UI without changing the chat command plumbing.

**Dependency impact:**
- Satisfied Worker 1 Task 2 by completing the staged ROOM_CREATE path that Task 1 intentionally left as stored state only.
- Extended the shared `aiChat` slice contract with `pendingRequestId` so staged command UIs stay tied to the correct backend request.

**Files touched:**
- `src/app/store/clientState.ts`
- `src/features/ai-chat/aiChatMessage.ts`
- `src/features/ai-chat/roomCreateFlow.ts`
- `src/pages/MainPage/aiChatInitialization.ts`
- `src/pages/MainPage/index.tsx`
- `src/shared/styles/global.css`
- `src/shared/types/clientState.ts`
- `tests/app/aiChatInitialization.test.mjs`
- `tests/app/roomCreateFlow.test.mjs`

**Commit:**
- `3272fb1`

**Verification completed:**
- [x] Manual review confirmed difficulty selection and template confirmation both send natural-language follow-up messages through the existing `{ message }` request shape.
- [x] `npm test`
- [x] `npm run build`
- [x] Independent `gpt-5.4` subagent review after implementation, with follow-up fixes applied for stale template metadata leakage across requests and missing immediate waiting-room transition on room-create success
- [x] Planned helper-level coverage now exercises staged ROOM_CREATE gating and request-scoped template metadata handling
- [x] Manual review confirmed successful room creation stays on `/main` and enters waiting-room mode without route navigation

**Not verified:**
- [ ] Planned integration test for no-room prompt, difficulty selection, template selection, and room-create success because the repo still does not have an integration harness
- [ ] Planned component test for staged UI rendering from command result and assistant metadata because the repo still does not have a DOM/component test harness
- [ ] Browser-level manual `/main` smoke test against a running app instance

**Design decisions:**
- Stored `pendingRequestId` alongside `pendingCommand` so template and difficulty metadata are always scoped to the currently active staged backend request.
- Used an explicit temporary waiting-room transition state on `/main` after ROOM_CREATE success so the page changes mode immediately from the command result instead of depending entirely on refetch timing.
- Kept waiting-room rendering intentionally shallow for Task 2: this task establishes the mode switch and retryable transition, while Task 4 will add participant/status/start controls.

**Deviations from spec:**
- No intentional contract deviation. The implementation follows the spec requirement to show difficulty UI on `PENDING`, render template selection from `assistantMessage.metadata.templates`, and stay on `/main` after room creation.

**Trade-offs:**
- Added helper-level parsing and gating tests instead of introducing a DOM/component harness during Task 2, which keeps the diff smaller but leaves rendered staged-card assertions for later QA work.
- Represented room-create success with an interim waiting-room transition state rather than fabricating a partial `currentRoom` object before the authoritative room query returns.

**Open questions:**
- [ ] Task 3 still needs to decide whether invitation completion summaries should reuse the same inline assistant-card pattern or appear only as invitation card state changes.
- [ ] Browser-level `/main` verification remains unresolved for the Worker 1 stream.
- [x] Initial review found stale template metadata from older ROOM_CREATE attempts could hijack a new staged flow → fixed by scoping staged metadata to `pendingRequestId`
- [x] Initial review found ROOM_CREATE success could drop staged state before `/main` visibly entered waiting-room mode → fixed by adding an interim waiting-room transition state with retryable room-sync behavior

**Instructions for the next worker:**
- Read this entry, then open [roomCreateFlow.ts](/Users/imhyeon/Documents/GitHub/frontend/src/features/ai-chat/roomCreateFlow.ts) and [index.tsx](/Users/imhyeon/Documents/GitHub/frontend/src/pages/MainPage/index.tsx) before starting Task 3.
- Preserve the `pendingCommand` + `pendingRequestId` pairing when adding new staged command UIs; do not go back to scanning full message history without request scoping.
- Treat the new waiting-room transition state as a bridge into Task 4, not the final waiting-room UI.

## Entry: 2026-05-25 Mock QA Support

**Track:**
- Plan file: `docs/plans/worker-1-main-chat-and-waiting-room-plan.md`
- Task: `Frontend-only mock data support for /main staged ROOM_CREATE verification`
- Dependencies reviewed:
  - `docs/implementation-logs/README.md`
  - `docs/implementation-logs/worker-1/phase-4a-ai-chat.md` Task 1 and Task 2 entries
  - `docs/specs/05-ai-chat-flow.md`
  - `docs/specs/08-error-loading-and-navigation.md`
  - `docs/specs/09-testing-and-milestones.md`

**What was done:**
- Added query-gated `/main` mock mode support for `?mock=room-create` and `?mock=room-create-delay` so the staged ROOM_CREATE flow can be exercised without backend APIs.
- Added a stateful `mockMode` data source that simulates current-room, session, message, and send-message behavior for the room-create flow.
- Allowed protected-route bypass only for `/main` when a supported mock scenario is present, so the mock path can be opened without login while normal protected routes stay unchanged.
- Added an in-page mock-mode notice and reset action so the staged flow can be replayed without a full backend setup.
- Added regression tests for mock scenario parsing, protected-route bypass gating, the full backendless room-create sequence, delayed room-sync behavior, invalid template confirmation, and mock reset behavior.
- Incorporated `gpt-5.4` review feedback by isolating mock state per instance/scenario switch and requiring template-stage confirmation to match one of the currently offered templates.

**Why it matters for the next worker:**
- Worker 1 can now manually verify Task 2 and later invitation/waiting-room work in the browser before backend endpoints exist.
- The mock mode gives a repeatable frontend-only path for checking `/main` interactions while preserving the normal production data path.

**Dependency impact:**
- Does not change the normal `/main` runtime path unless a supported `mock` query parameter is present.
- Introduces a dedicated manual verification route for Worker 1 tasks:
  - `/main?mock=room-create`
  - `/main?mock=room-create-delay`

**Files touched:**
- `src/app/router/AppRouter.tsx`
- `src/app/router/authRouting.ts`
- `src/pages/MainPage/index.tsx`
- `src/pages/MainPage/mockMode.ts`
- `tests/app/authRouting.test.mjs`
- `tests/app/mainPageMockMode.test.mjs`

**Commit:**
- `bef0fc9`

**Verification completed:**
- [x] `npm test`
- [x] `npm run build`
- [x] `node --test tests/app/mainPageMockMode.test.mjs tests/app/authRouting.test.mjs`
- [x] Independent `gpt-5.4` subagent review after implementation, with follow-up fixes applied for mock-state isolation, template confirmation validation, and direct-node/build compatibility

**Not verified:**
- [ ] Browser-level manual `/main?mock=room-create` and `/main?mock=room-create-delay` smoke test inside a running dev server

**Design decisions:**
- Kept mock behavior query-gated and `/main`-only so the auth bypass cannot leak into other protected routes.
- Modeled the mock flow as a stateful local API rather than scattering one-off debug conditionals across the existing page logic.
- Added a second delayed-sync scenario so the Task 2 waiting-room transition state can also be exercised without backend timing control.

**Deviations from spec:**
- No production-path contract deviation. The mock mode is a frontend-only testing aid and does not alter the real API contract or normal authenticated route behavior.

**Trade-offs:**
- Added local mock infrastructure instead of waiting for MSW/integration harness setup, which makes verification available now but keeps the mock flow scoped to `/main` and manual use.
- The auth-bypass coverage remains helper-level rather than full router-render integration coverage because the repo still lacks a route/component harness.

**Open questions:**
- [ ] Decide later whether this mock mode should stay as a long-lived developer aid or be replaced by MSW-based integration coverage in Phase 8 QA.
- [x] Initial review found mock state reuse across scenario switches could make backendless testing nondeterministic → fixed by isolating and resetting state per mock instance/scenario
- [x] Initial review found any free-text message could complete template confirmation in mock mode → fixed by requiring the message to match one of the currently offered templates

**Instructions for the next worker:**
- To manually exercise the frontend-only staged flow, run `npm run dev` and open:
  - `/main?mock=room-create`
  - `/main?mock=room-create-delay`
- Preserve the query-gated boundary: mock behavior must not activate without an explicit supported `mock` query parameter on `/main`.
