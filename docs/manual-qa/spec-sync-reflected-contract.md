# Manual QA: Reflected Contract (Spec Sync 2026-05-31)

This checklist verifies behavior aligned with `docs/specs/*` after the shared API contract sync. Automated coverage lives in `tests/app/specSyncRegression.test.mjs` plus the focused suites listed under each section.

## Prerequisites

- Backend (or staging) running with the reflected API and Socket.IO endpoints.
- Frontend: `npm run dev` with `VITE_API_BASE_URL` / `VITE_SOCKET_URL` pointing at that backend.
- Authenticated test users (owner + at least one participant).

## 1. Close-code handling (`4401`, `4403`, `4404`, `1000`)

| Step | Action | Expected |
|------|--------|----------|
| 1.1 | Join a room and open `/rooms/:gameRoomId/play` with a valid session | Socket `connectionStatus` is `connected` |
| 1.2 | Invalidate auth (expire token or revoke session) while on a room route | Socket closes with `4401`; user is sent to login; tokens cleared |
| 1.3 | Trigger forbidden room access (`4403`) or missing room (`4404`) | User redirected to `/main`; room/game/editor/participants cleared; close metadata retained on `realtime` |
| 1.4 | Disconnect intentionally (leave room / normal close `1000`) on RoomPage | Recovery banner shown; **no** auto-reconnect; policy does not call `leave()` and flip to `left` |
| 1.5 | After `4403`/`4404`, attempt to return to the old room URL | Terminated-session latch blocks reconnect-and-resume |

**Automated:** `tests/app/socketClosePolicy.test.mjs`, `tests/app/authRouting.test.mjs`, `tests/app/roomSocketLifecycle.test.mjs`, `tests/app/specSyncRegression.test.mjs`

## 2. Main → waiting room (mock or live)

Mock mode covers **pre-game only** (`/main?mock=...`). It does **not** simulate gameplay sockets.

| Query | Scope |
|-------|--------|
| `?mock=room-create` | AI room-create → waiting room |
| `?mock=room-create-delay` | Delayed `GET /game-rooms` hydration |
| `?mock=invitation` | Accept/deny invitation |
| `?mock=invitation-delay` | Delayed room after join |
| `?mock=start-ready` | Owner waiting room + `POST start-game` HTTP success **without** leaving `WAITING` |

`start-ready` confirms HTTP start success is **not** a gameplay route gate. Entry to `/rooms/:id/play` still requires a live `game-started` event with `uiHints.enterGameScreen: true`.

**Automated:** `tests/app/mainPageMockMode.test.mjs`, `tests/app/mainInitialization.test.mjs`, `tests/app/roomWaitingState.test.mjs`

## 3. Gameplay entry (`game-started`)

| Step | Action | Expected |
|------|--------|----------|
| 3.1 | Owner starts game from waiting room (live backend) | HTTP may succeed while room stays `WAITING` until realtime events arrive |
| 3.2 | Receive `game-started` with `enterGameScreen: true` | Navigate to `/rooms/:gameRoomId/play`; mission/editor bootstrapped from payload |
| 3.3 | Receive `game-started` with `enterGameScreen: false` | State updates **without** navigation to play |
| 3.4 | Receive `game-state-updated` (including `FINISHED`) | State merges; **no** route change |

**Automated:** `tests/app/realtimeEventReducers.test.mjs`, `tests/app/specSyncRegression.test.mjs`

## 4. Delta code sync and hints

| Step | Action | Expected |
|------|--------|----------|
| 4.1 | Current player edits during `IN_PROGRESS` on own turn | Debounced `code-change` emits range deltas, not full-file snapshots |
| 4.2 | Teammate receives `code-updated` | Working `editor.files` updates; echo suppressed for own `sessionId` |
| 4.3 | Open hint on current step | `GET` hint by step id; `hintText: null` cached as a valid response |
| 4.4 | Non-current player or read-only tab | Editor read-only; outbound `code-change` not emitted |

**Automated:** `tests/app/codeDelta.test.mjs`, `tests/app/editorCodeDeltaSync.test.mjs`, `tests/app/codeChangeEmitScheduler.test.mjs`, `tests/app/hintCache.test.mjs`

## 5. Turn flow and result routing

| Step | Action | Expected |
|------|--------|----------|
| 5.1 | Submit turn (`turn-submit`) | Editor locked (`turnSubmissionPending`) until `turn-changed` |
| 5.2 | Receive `turn-evaluated` | Evaluation UI + markers; lock **remains** |
| 5.3 | Receive `turn-changed` | New turn state; lock cleared; markers reset |
| 5.4 | Receive `mission-result` | `missionResult` in memory; navigate to `/rooms/:gameRoomId/result` |
| 5.5 | Hard refresh on `/result` | Empty/placeholder when `missionResult` not in memory (v1 in-memory contract) |

**Automated:** `tests/app/turnProgression.test.mjs`, `tests/app/gameTurn.test.mjs`, `tests/app/specSyncRegression.test.mjs`

## Full automated gate

```bash
npm test
npx tsc -p tsconfig.app.json
```

`npm run build` may still fail on pre-existing `vite.config.ts` typing; treat `tsc -p tsconfig.app.json` as the app typecheck gate until that is fixed.

## Spec references

- `docs/specs/06-realtime-and-gameplay.md`
- `docs/specs/08-error-loading-and-navigation.md`
- `docs/specs/09-testing-and-milestones.md`
