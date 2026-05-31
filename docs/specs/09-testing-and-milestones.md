# Testing And Milestones

## Test Strategy

Unit tests:

- API response unwrapping
- API error translation
- token refresh retry
- error-code mapping
- zero-or-one current-room interpretation
- AI chat command branching
- editability calculation
- timer calculation
- realtime event reducers
- realtime close-code handling

Component tests:

- login form
- signup form
- chat panel
- chat message list
- invitation card
- waiting-room status
- waiting-room participant list
- game header
- turn indicator
- turn timer
- code editor
- turn evaluation panel
- mission result panel

Integration tests:

- successful login
- token expiry followed by successful refresh
- refresh failure routing to login
- main page initial state hydration
- AI room creation prompt when there is no room
- invitation card rendering
- invitation acceptance into waiting-room state
- single current-room save from `GET /game-rooms`
- duplicate warning when `GET /game-rooms` returns more than one room
- `IN_PROGRESS` room initialization into gameplay re-entry
- waiting-room initialization after `join-room`
- route transition after `game-started`
- socket close handling for `4401`, `4403`, and `4404`
- evaluation UI after `turn-evaluated`
- editability changes after `turn-changed`
- result routing after `mission-result`
- terminated-session handling instead of automatic reconnect

E2E tests:

- login
- enter main page
- create a room through AI chat
- choose difficulty
- choose mission template
- verify waiting-room state on the main page
- verify invited user entry
- start the game
- enter gameplay
- edit code
- submit a turn
- verify turn evaluation
- verify next-turn transition
- verify final mission result

## Delivery Milestones

Phase 1. Foundation

- project setup
- router setup
- provider setup
- API client
- shared types
- shared error handling

Phase 2. Auth

- login page
- signup page
- nickname duplication check
- token persistence
- token refresh
- route guard

Phase 3. MainPage Initial State

- current room query
- single-room policy handling
- invitation query
- AI chat session query
- AI chat message query

Phase 4. Main AI Chat

- AI chat message send
- ROOM_CREATE UI
- USER_INVITE UI
- ROOM_JOIN UI
- USER_INVITE_DENY UI
- GAME_START UI

Phase 5. MainPage Waiting Room

- waiting-room status UI
- participant list
- participant change messages
- start button
- start-game API

Phase 6. RoomPage

- realtime connection
- `game-started` handling
- mission-state rendering
- game-state rendering
- Monaco integration
- file tabs
- hint fetch

Phase 7. Realtime Gameplay

- `join-room`
- `room-participants-updated`
- `code-change` and `code-updated` delta synchronization
- `turn-submit`
- `turn-evaluated`
- `turn-changed`
- `game-state-updated`
- `mission-result`

Phase 8. QA

- MSW integration tests
- Playwright E2E
- error-state review
- loading-state review
- empty-state review

## Resolved Contracts

1. AI chat session creation happens automatically after `POST /auth/signup`.
2. `game-started` includes editor bootstrapping metadata via `missionState.projectStructure.files`.
3. Code synchronization uses delta payload semantics.
4. The backend guarantees one waiting room per user when status is `WAITING`.
5. `GET /game-rooms` may drive either `WAITING` initialization or `IN_PROGRESS` gameplay re-entry.
6. Mission template selection is sent as a natural-language chat message.
7. AI chat message pagination is unnecessary in the current version.
8. Access token storage uses `sessionStorage`; refresh token storage uses `localStorage`.
9. The client hashes passwords with SHA-256 before submission.
10. WebSocket close codes `4401`, `4403`, and `4404` drive terminated-session handling.
