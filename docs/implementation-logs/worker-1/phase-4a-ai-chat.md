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
