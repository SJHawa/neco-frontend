# Modules

## Proposed Source Layout

```txt
src/
  app/
    router/
    providers/
    store/

  pages/
    LoginPage/
    SignupPage/
    MainPage/
    RoomPage/
    ResultPage/
    NotFoundPage/

  features/
    auth/
    ai-chat/
    game-room/
    room-waiting/
    invitation/
    game-turn/
    editor/
    hint/
    realtime/

  entities/
    user/
    participant/
    mission/
    message/
    code-snapshot/

  shared/
    api/
    socket/
    components/
    hooks/
    constants/
    utils/
    types/
    styles/
```

## Ownership and Responsibilities

- `auth`: signup, login, token refresh, auth state
- `ai-chat`: session loading, message loading, message send, command-result rendering
- `game-room`: current room lookup and start-game request
- `room-waiting`: waiting-room state and participant status UI shown inside `/main`
- `invitation`: invitation cards and accept/deny interactions
- `game-turn`: turn state, timer, submit flow, evaluation state
- `editor`: Monaco integration and file-tab management
- `hint`: current-step hint fetching and cache handling
- `realtime`: socket connection lifecycle and event dispatch

## Layering Rules

- `shared` contains low-level primitives with no product-specific orchestration
- `entities` define reusable domain models and entity-focused helpers
- `features` coordinate business behavior
- `pages` compose feature modules into route-level screens
- `app` wires providers, router, and global store setup

## Dependency Guidance

- `pages` may depend on `features`, `entities`, and `shared`
- `features` may depend on `entities` and `shared`
- `entities` may depend on `shared`
- `shared` must not depend on higher-level product layers

## Storage Responsibilities

- server state: TanStack Query
- client session and interaction state: Zustand
- persistent auth storage: browser storage based on the security contract
