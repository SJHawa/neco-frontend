# Phase 2 Task 3: Socket Close-Code Policy

## Entry: 2026-05-31 Task 3

**Track:**
- Plan file: `docs/plans/2026-05-31-spec-sync-follow-up-plan.md`
- Task: `Task 3: Upgrade socket lifecycle state for reflected close-code handling`
- Dependencies reviewed:
  - `docs/implementation-logs/spec-sync-2026-05-31/phase-1-task-1-shared-contract-alignment.md`
  - `docs/implementation-logs/spec-sync-2026-05-31/phase-1-task-2-main-page-adapters-alignment.md`
  - `docs/specs/01-architecture.md`, `docs/specs/08-error-loading-and-navigation.md`

**What was done:**
- Added `socketClosePolicy.ts` with reflected application close-code mapping (`4401`, `4403`, `4404`, `1000`) and latch helpers.
- Added `applySocketClosePolicy.ts` / `useRealtimeClosePolicy.ts` wired through `AppLayout` so closed sockets trigger policy side effects once per close signature.
- `4401` calls `notifyAuthLogout()`; `4403` / `4404` leave the socket, clear all room-scoped slices (`room`, `game`, `editor`, `realtime.participants`), and navigate from room routes to `/main`; `1000` is excluded from policy application so `connectionStatus` stays `closed` and RoomPage shows the recovery banner without auto-reconnect.
- Extended `authRouting.ts` with `getSocketCloseRouteTarget` / `isRoomScopedPath`; improved `RoomPage` close banners via `getRealtimeCloseBannerCopy` and mapped reason codes through `errorMessageMap`.
- Incorporated review feedback: intentional `1000` no longer calls `socketController.leave()` (avoids flipping `closed` → `left`); terminated-session cleanup resets `game`, `editor`, and `realtime.participants` in addition to room HTTP context.

**Why it matters for the next worker:**
- Task 4 reducers should assume `closed` + close metadata can remain on the room page after intentional `1000`; do not reintroduce policy `leave()` for that path.
- After `4403` / `4404`, room-scoped gameplay data is cleared; merge realtime events into fresh state rather than assuming stale `game` / `editor` / `participants` remain.
- `useRealtimeClosePolicy` runs globally; new room-route behavior should compose with `shouldApplySocketClosePolicy` instead of duplicating navigation or logout rules.

**Dependency impact:**
- Satisfies Phase 2 Task 3: reflected close-code policy is enforced with tests and without automatic reconnect-and-resume.
- Unblocks Task 4 (`room-participants-updated`, `game-started`, `game-state-updated` reducers) on a stable terminated-session and intentional-close boundary.

**Files touched:**
- `src/features/realtime/socketClosePolicy.ts`
- `src/features/realtime/applySocketClosePolicy.ts`
- `src/features/realtime/useRealtimeClosePolicy.ts`
- `src/features/realtime/roomSocketLifecycle.ts`
- `src/features/realtime/useRoomSocketLifecycle.ts`
- `src/app/router/authRouting.ts`
- `src/app/router/AppRouter.tsx`
- `src/pages/RoomPage/index.tsx`
- `tests/app/socketClosePolicy.test.mjs`
- `tests/app/authRouting.test.mjs`
- `tests/app/roomSocketLifecycle.test.mjs`

**Commit:**
- `2aa5b1e`

**Verification completed:**
- [x] `node --experimental-strip-types --import ./tests/helpers/registerResolveTsLoader.mjs --test tests/app/roomSocketLifecycle.test.mjs tests/app/authRouting.test.mjs tests/app/socketClosePolicy.test.mjs` (23 passed)
- [x] `npx tsc -p tsconfig.app.json`
- [x] Manual contract review against `docs/specs/01-architecture.md` and `docs/specs/08-error-loading-and-navigation.md`
- [x] Review feedback incorporated (intentional `1000` recovery banner, full room-scoped cleanup on `4403` / `4404`)

**Not verified:**
- [ ] `npm run build` — same pre-existing `vite.config.ts` typing issue noted in Task 1
- [ ] End-to-end manual QA against a live backend

**Design decisions:**
- `shouldApplySocketClosePolicy` skips `intentional-close` so the lifecycle controller keeps `closed` state for the recovery UI while the existing terminated latch still blocks reconnect.
- Terminated-session cleanup preserves `realtime.closeCode`, `closeReasonCode`, and `connectionStatus: "closed"` for diagnostics and possible `/main` messaging; it clears gameplay slices via `createInitialState()` defaults.
- `connect_error` no longer writes transport errors into `closeReasonCode`, keeping application close metadata separate from connection failures.

**Deviations from spec:**
- None intentional.

**Trade-offs:**
- Close-policy navigation uses React Router `navigate` for `4403` / `4404` while `4401` uses `window.location.assign` via `notifyAuthLogout()` to match existing auth logout behavior.
- `/main` does not yet show a dedicated post-`4403` / `4404` notice; users see cleared room context after redirect.

**Open questions:**
- [ ] Should `/main` surface a toast or banner when `realtime.closeCode` is `4403` / `4404` after redirect?
- [x] Should intentional `1000` call `leave()` immediately? → No; keep `closed` until the user uses the recovery CTA (review resolved).

**Instructions for the next worker:**
- Read this entry, then start **Task 4** in `docs/plans/2026-05-31-spec-sync-follow-up-plan.md`.
- Preserve `shouldApplySocketClosePolicy` / `applySocketClosePolicy` invariants when extending realtime reducers.
- Route gameplay entry from `game-started` only; do not bypass close-code or terminated-session guards with HTTP polling or manual navigation hacks.
