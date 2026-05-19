# Implementation Plan: Common Sequential Track

## Overview
This track contains the work that must be completed before two workers can move independently. It establishes the frontend foundation, shared contracts, authentication, and the `/main` initialization path that both later streams depend on.

## Architecture Decisions
- Follow the spec phase order up to the `/main` initialization checkpoint because routing, auth persistence, API handling, and shared state contracts are prerequisites for both downstream streams.
- Keep the worker split at the route boundary after initialization: Worker 1 owns `/main` AI chat and waiting-room behavior, and Worker 2 owns `/rooms/:gameRoomId/*` gameplay and realtime-heavy behavior.
- Define shared ownership early to reduce merge conflicts: `shared/*`, `app/*`, and cross-feature state contracts are completed here before worker-specific feature work starts.

## Dependency Boundary For Parallel Work
- Must stay sequential:
  - project setup and route skeleton
  - shared API client, error mapping, and domain types
  - auth storage, refresh, and route guards
  - `/main` initial hydration for current room, invitations, AI chat session, and messages
- Can start in parallel only after the checkpoint below is complete:
  - Worker 1: AI chat command flows and waiting-room UI on `/main`
  - Worker 2: gameplay route, editor, hint flow, and realtime gameplay events

## Task List

### Phase 1: Foundation

## Task 1: Scaffold frontend runtime and route shell

**Description:** Create the base React + TypeScript + Vite application shell, route map, providers, and source layout from `docs/specs/03-modules.md` so later feature work lands on stable directories and route boundaries.

**Acceptance criteria:**
- [ ] The `src/` structure matches the module layout from `docs/specs/03-modules.md` closely enough for feature ownership.
- [ ] The router defines `/`, `/login`, `/signup`, `/main`, `/rooms/:gameRoomId/play`, and `/rooms/:gameRoomId/result`.
- [ ] Shared providers for routing, query state, and global client state are mounted once at the app root.

**Verification:**
- [ ] Structural review against `docs/specs/01-architecture.md` and `docs/specs/03-modules.md`
- [ ] Route smoke test confirms each planned route resolves to a page shell
- [ ] Planned build check passes once package scripts exist

**Dependencies:** None

**Files likely touched:**
- `src/app/router/*`
- `src/app/providers/*`
- `src/pages/*`
- `src/main.tsx`

**Estimated scope:** Large: 5+ files

## Task 2: Implement shared domain types, API client, and error translation

**Description:** Establish the shared HTTP layer, API envelope unwrapping, typed application errors, and shared domain models so all feature modules can consume the same backend contract.

**Acceptance criteria:**
- [ ] Shared types cover the domain models and API envelope defined in `docs/specs/02-domain-model.md`.
- [ ] The API client retries once on `401` or `AUTH_TOKEN_EXPIRED`, then logs out on refresh failure.
- [ ] Error-code mapping follows `docs/specs/08-error-loading-and-navigation.md` and is reusable by feature UIs.

**Verification:**
- [ ] Shared contract review against `docs/specs/02-domain-model.md`, `docs/specs/04-api-and-auth.md`, and `docs/specs/08-error-loading-and-navigation.md`
- [ ] Planned unit tests cover response unwrapping, error translation, and refresh retry behavior
- [ ] Planned build/type check passes once tooling exists

**Dependencies:** Task 1

**Files likely touched:**
- `src/shared/api/*`
- `src/shared/types/*`
- `src/shared/constants/*`
- `src/shared/utils/*`

**Estimated scope:** Medium: 3-5 files

### Checkpoint: Foundation
- [ ] Route shells, providers, and shared contracts are stable enough for feature work
- [ ] Shared ownership boundaries are documented before parallel work starts touching feature modules
- [ ] Human review confirms no missing cross-cutting contract from `docs/specs/01-04.md`

### Phase 2: Auth

## Task 3: Implement signup flow and nickname availability check

**Description:** Build the signup page flow, including field validation, SHA-256 password hashing, nickname duplication checks, and conflict-specific error mapping.

**Acceptance criteria:**
- [ ] Signup sends the request shape from `docs/specs/04-api-and-auth.md`, including client-side password hashing.
- [ ] Nickname availability checks and signup conflict messages are rendered at the correct field or form level.
- [ ] Signup success navigates according to the agreed product rule and does not bypass auth-state constraints.

**Verification:**
- [ ] Planned component tests cover signup field validation and conflict states
- [ ] Planned integration test covers successful signup and AI chat session post-signup assumption
- [ ] Manual review confirms storage rules are not applied prematurely before login

**Dependencies:** Task 2

**Files likely touched:**
- `src/features/auth/*`
- `src/pages/SignupPage/*`
- `src/entities/user/*`

**Estimated scope:** Medium: 3-5 files

## Task 4: Implement login, token persistence, refresh, and route guards

**Description:** Complete the authentication runtime by wiring login, session persistence, token refresh, logout-on-refresh-failure behavior, and protected route navigation.

**Acceptance criteria:**
- [ ] Login stores the access token in `sessionStorage` and the refresh token in `localStorage`.
- [ ] Protected routes redirect unauthenticated users to `/login`, and authenticated users are redirected away from `/login` and `/signup`.
- [ ] Refresh failure clears auth state and returns the user to `/login`.

**Verification:**
- [ ] Planned unit tests cover token storage and refresh retry rules
- [ ] Planned integration tests cover login success, refresh success, and refresh-failure routing
- [ ] Manual route-guard matrix review confirms navigation rules from `docs/specs/01-architecture.md`

**Dependencies:** Task 3

**Files likely touched:**
- `src/features/auth/*`
- `src/app/router/*`
- `src/shared/api/*`

**Estimated scope:** Medium: 3-5 files

### Checkpoint: Auth
- [ ] Auth flows, token storage, and refresh routing behave according to `docs/specs/04-api-and-auth.md`
- [ ] Downstream workers can assume authenticated access and stable route guards
- [ ] Human review confirms no unresolved auth contract ambiguity remains

### Phase 3: `/main` Initialization

## Task 5: Implement current-room and invitation initialization

**Description:** Build the `/main` boot sequence for current-room lookup, zero-or-one room interpretation, duplicate warning handling, and invitation loading so pre-game UI can start from authoritative server state.

**Acceptance criteria:**
- [ ] `GET /game-rooms` is treated as a single-current-room query with duplicate warning handling for abnormal multi-room responses.
- [ ] Invitation queries load `INVITED` records for the signed-in user and persist them in shared client state.
- [ ] `/main` shows loading, empty, and retryable states aligned with `docs/specs/08-error-loading-and-navigation.md`.

**Verification:**
- [ ] Planned unit test covers zero-or-one current-room interpretation and duplicate warning behavior
- [ ] Planned integration test covers main-page initial hydration for current room and invitations
- [ ] Manual review confirms current-room rules from `docs/specs/02-domain-model.md`

**Dependencies:** Task 4

**Files likely touched:**
- `src/features/game-room/*`
- `src/features/invitation/*`
- `src/pages/MainPage/*`
- `src/app/store/*`

**Estimated scope:** Medium: 3-5 files

## Task 6: Implement AI chat session and message initialization

**Description:** Finish `/main` initialization by selecting the active AI chat session, loading chat messages, and persisting the session/message baseline that Worker 1 will extend with command flows.

**Acceptance criteria:**
- [ ] Active AI chat session selection follows the priority rules in `docs/specs/05-ai-chat-flow.md`.
- [ ] Messages load only for the selected active session and are stored in shared client state.
- [ ] `/main` renders the no-room/no-invitation AI-led empty prompt when initialization finds neither current room nor invitations.

**Verification:**
- [ ] Planned unit test covers active session selection rules
- [ ] Planned integration test covers main-page hydration including AI chat session and message loading
- [ ] Manual review confirms loading and empty-state behavior from `docs/specs/08-error-loading-and-navigation.md`

**Dependencies:** Task 5

**Files likely touched:**
- `src/features/ai-chat/*`
- `src/pages/MainPage/*`
- `src/app/store/*`

**Estimated scope:** Medium: 3-5 files

### Checkpoint: Parallel Split Ready
- [ ] `/main` initialization is complete for current room, invitations, AI chat session, and messages
- [ ] Shared state slices for `auth`, `aiChat`, `room`, `game`, `editor`, and `realtime` are stable enough for split ownership
- [ ] Worker 1 can start `/main` interaction work without waiting on gameplay code
- [ ] Worker 2 can start gameplay and realtime work without changing auth or initialization contracts

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Shared store shape changes after parallel work starts | High | Freeze store contracts at the final checkpoint before worker split |
| Auth refresh behavior leaks into feature modules inconsistently | High | Centralize retry/logout behavior in the shared API client during Task 2 |
| `/main` initialization becomes entangled with interactive chat behavior | Medium | Stop Task 6 at read-only hydration; leave command submission for Worker 1 |

## Open Questions
- Should the signup success route be finalized as `/login` or immediate `/main` entry before implementation begins?
- Should the shared realtime store expose event reducers directly, or should Worker 2 own reducer composition after the split?
