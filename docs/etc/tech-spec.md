# Relay Coding Frontend Technical Specification

## 1. 문서 목적

이 문서는 `Relay Coding Server API Specification v1.2`를 기준으로 프론트엔드 구현에 필요한 기술 설계를 정리한다.

프론트엔드는 AI 채팅을 중심으로 방 생성, 초대 확인, 방 참가, 게임 시작 준비를 처리하고, 게임 시작 이후에는 Socket.IO 이벤트를 기준으로 실시간 릴레이 코딩 게임 상태를 동기화한다.

본 문서는 백엔드 API 구현 방식이 아니라, 프론트엔드가 API와 Socket.IO 이벤트를 어떻게 호출하고 화면 상태로 반영할지를 정의한다.

## 2. 구현 범위

### 포함 범위

- 회원가입
- 로그인
- access token 재발급
- 메인 화면 초기 상태 구성
- 현재 사용자의 게임방 상태 확인
- 현재 사용자의 초대 상태 확인
- AI 채팅 세션 조회
- AI 채팅 메시지 조회 및 전송
- AI 채팅 기반 방 생성
- AI 채팅 기반 사용자 초대
- AI 채팅 기반 초대 수락
- AI 채팅 기반 초대 거절
- AI 채팅 기반 게임 시작 준비
- 게임 시작 요청
- MainPage 내 참가자 대기 상태 표시
- 게임 플레이 화면
- 현재 미션 단계 힌트 조회
- Socket.IO 기반 참가자 상태 동기화
- Socket.IO 기반 코드 동기화
- Socket.IO 기반 턴 제출, 턴 판정, 턴 변경 처리
- Socket.IO 기반 게임 시작, 게임 상태, 최종 결과 처리

### 제외 범위

- 랭킹
- 통계
- 회고 화면
- 결제
- 상점
- 업적
- 코드 실행 HTTP API
- AI 디버깅 HTTP API

## 3. 핵심 설계 원칙

### AI 채팅 중심 UX

방 생성부터 게임 시작 직전까지는 별도 대기방 페이지로 이동하지 않는다. MainPage의 AI 채팅 화면 안에서 다음 상태를 모두 처리한다.

- 방 생성 전
- 미션 템플릿 제안
- 방 생성 완료
- 친구 초대
- 초대 수락 또는 거절
- 참가자 입장 대기
- 게임 시작 가능 상태

### 게임 화면 전환 기준

게임 시작 전 상태는 `/main`에서 유지한다. 실제 게임이 시작되면 `/rooms/:gameRoomId/play`로 이동한다.

게임 화면 진입 정보와 초기 미션 상태는 HTTP start API 응답이 아니라 Socket.IO의 `game-started` 또는 `game-state-updated` 이벤트를 기준으로 반영한다.

### 한 사용자당 한 방 정책

서비스 정책상 한 사용자는 동시에 하나의 게임방에만 소속될 수 있다.

`GET /game-rooms` API는 배열을 반환하지만, 프론트엔드는 이 응답을 목록 UI로 취급하지 않는다. 현재 사용자의 방 상태는 다음처럼 해석한다.

- `data.length === 0`: 현재 소속된 방 없음
- `data.length === 1`: 현재 소속된 방 있음
- `data.length > 1`: 비정상 상태로 간주하고 가장 최신 `updatedAt` 항목을 우선 사용하되, 모니터링 또는 에러 로깅 대상

따라서 메인 화면에는 “접근 가능한 게임방 목록”이 아니라 “현재 소속된 게임방 상태”로 표현한다.

## 4. 기술 스택

### Core

- React
- TypeScript
- Vite
- React Router
- TanStack Query
- Zustand
- Axios 또는 Fetch 기반 API client

### Editor

- Monaco Editor

### Realtime

- Socket.IO Client

실시간 이벤트는 Socket.IO의 event name 기반으로 송수신한다.

### Testing

- Vitest
- React Testing Library
- MSW
- Playwright

## 5. 라우팅 설계

```txt
/                         -> 인증 상태에 따라 /main 또는 /login으로 redirect
/login                    -> 로그인 화면
/signup                   -> 회원가입 화면
/main                     -> AI 채팅 기반 메인 화면
/rooms/:gameRoomId/play   -> 게임 플레이 화면
/rooms/:gameRoomId/result -> 게임 결과 화면
```

### 라우트 보호 정책

- 로그인하지 않은 사용자는 `/login`으로 이동한다.
- 로그인한 사용자가 `/login`, `/signup`에 접근하면 `/main`으로 이동한다.
- access token 재발급 실패 시 인증 정보를 제거하고 `/login`으로 이동한다.
- `/rooms/:gameRoomId/play` 진입 시 local game state가 없으면 Socket.IO 연결 후 서버 이벤트를 기다린다.
- 

## 6. 환경 변수

최종 HTTP API base URL은 `/v1`이다.

```env
VITE_API_BASE_URL=/v1
VITE_SOCKET_URL=http://localhost:8080
```

운영 환경에서는 HTTPS 기반 origin 또는 TLS가 적용된 Socket.IO endpoint를 사용한다.

## 7. 디렉터리 구조

```txt
src/
  app/
    router/
      index.tsx
    providers/
      QueryProvider.tsx
      SocketProvider.tsx
      ThemeProvider.tsx
    store/
      index.ts
      slices/
    App.tsx

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

  assets/
  main.tsx
  vite-env.d.ts
```

### Feature 책임

- `auth`: 회원가입, 로그인, 토큰 재발급
- `ai-chat`: AI 채팅 세션, 메시지, AI 명령 결과 처리
- `game-room`: 현재 사용자의 게임방 상태, 게임 시작 요청
- `room-waiting`: MainPage 안에서 참가자 대기 상태 표시
- `invitation`: 초대 목록, 초대 수락/거절 UI
- `game-turn`: 턴 상태, 타이머, 턴 제출 및 판정 결과
- `editor`: Monaco 기반 코드 편집
- `hint`: 현재 미션 단계 힌트 조회
- `realtime`: Socket.IO 연결 및 이벤트 dispatch

## 8. 공통 API 응답 타입

```ts
export type ApiMeta = {
  requestId: string;
};

export type ApiError = {
  code: string;
  message: string;
};

export type ApiResponse<T> = {
  data: T | null;
  meta: ApiMeta;
  error: ApiError | null;
};
```

프론트 API client는 성공 응답에서 `data`를 반환하고, 실패 응답은 `ApiError`를 포함한 커스텀 에러로 변환한다.

## 9. 공통 도메인 타입

```ts
export type AiChatSessionStatus = "ACTIVE" | "CLOSED" | "ERROR";

export type AiChatRequestType =
  | "ROOM_CREATE"
  | "USER_INVITE"
  | "ROOM_JOIN"
  | "USER_INVITE_DENY"
  | "GAME_START";

export type AiChatRequestStatus = "RECEIVED" | "COMPLETED" | "FAILED";

export type AiChatMessageSenderType = "USER" | "ASSISTANT" | "SYSTEM";

export type AiChatMessageType = "TEXT" | "COMMAND_RESULT" | "SYSTEM_NOTICE";

export type RoomCommandStatus = "PENDING" | "SUCCESS" | "FAILED";

export type GameRoomStatus =
  | "WAITING"
  | "IN_PROGRESS"
  | "JUDGING"
  | "ANALYZED"
  | "FINISHED";

export type MembershipStatus = "INVITED" | "JOINED" | "LEFT" | "DENIED";

export type ParticipantRole = "OWNER" | "PARTICIPANT";

export type TurnStatus =
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "EXPIRED"
  | "COMPLETED";

export type ExecutionStatus = "SUCCESS" | "FAILED" | "TIMEOUT";

export type PresenceStatus = "ONLINE" | "OFFLINE" | "ACTIVE" | "IDLE";

export type AiRealtimeEventType =
  | "SYSTEM_NOTIFICATION"
  | "HINT_POPUP"
  | "DEBUG_SUMMARY"
  | "MISSION_FEEDBACK"
  | "MISSION_RESULT";
```

## 10. API Client 설계

### Client

```ts
export const apiClient = createApiClient({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});
```

### Request 처리

- 기본 `Content-Type`은 `application/json`이다.
- 인증 예외 API를 제외한 모든 요청에 access token을 포함한다.
- access token은 `Authorization: Bearer {accessToken}` 형식으로 전달한다.

### Response 처리

- `error === null`이면 `data`를 반환한다.
- `error !== null`이면 `ApiError`를 throw한다.
- HTTP 401 또는 `AUTH_TOKEN_EXPIRED` 발생 시 token refresh를 시도한다.
- refresh 성공 시 원 요청을 1회 재시도한다.
- refresh 실패 시 로그아웃 처리한다.

### API 모듈

```txt
authApi
aiChatApi
gameRoomApi
participantApi
hintApi
```

## 11. 인증 설계

### Auth State

```ts
export type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
};

export type AuthUser = {
  userId: string;
  loginId: string;
  nickname: string;
  email: string | null;
};
```

### Auth API 타입

```ts
export type CheckNicknameResponse = {
  isAvailable: boolean;
};

export type SignupRequest = {
  loginId: string;
  nickname: string;
  passwordHash: string;
  email?: string | null;
};

export type SignupResponse = {
  userId: string;
  loginId: string;
  nickname: string;
  email: string | null;
  createdAt: string;
};

export type LoginRequest = {
  loginId: string;
  passwordHash: string;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type RefreshTokenRequest = {
  refreshToken: string;
};

export type RefreshTokenResponse = {
  accessToken: string;
};
```

### 인증 저장 정책

- access token은 memory 또는 sessionStorage에 저장한다.
- refresh token은 localStorage 또는 secure cookie를 사용한다.
- 최종 저장 위치는 백엔드 보안 정책에 맞춰 확정한다.

## 12. MainPage 초기 상태 구성

로그인 후 MainPage는 다음 API를 호출해 현재 사용자의 상태를 구성한다.

```txt
GET /game-rooms?userId={userId}
GET /game-room-participants?userId={userId}&status=INVITED
GET /ai-chat-sessions?userId={userId}
```

### 초기화 순서

1. 현재 사용자 정보를 auth state에서 읽는다.
2. `GET /game-rooms?userId={userId}`로 현재 소속 방 상태를 조회한다.
3. `GET /game-room-participants?userId={userId}&status=INVITED`로 초대 상태를 조회한다.
4. `GET /ai-chat-sessions?userId={userId}`로 AI 채팅 세션을 조회한다.
5. 활성 AI 채팅 세션이 있으면 메시지 목록을 조회한다.
6. 현재 방이 `WAITING`이면 MainPage 안에 room waiting UI를 표시한다.
7. 현재 방이 `IN_PROGRESS`이면 게임 재진입 CTA를 표시하거나 `/rooms/:gameRoomId/play`로 이동한다.
8. 현재 방과 초대가 모두 없으면 AI 채팅 기반 방 생성 UX를 표시한다.

### 현재 게임방 해석

```ts
export type CurrentGameRoom = {
  gameRoomId: string;
  title: string;
  status: GameRoomStatus;
  ownerUserId: string;
  myRole: ParticipantRole;
  myMembershipStatus: MembershipStatus;
  joinedParticipantCount: number;
  minParticipants: number;
  maxParticipants: number;
  createdAt: string;
  updatedAt: string;
};
```

`GET /game-rooms`는 배열을 반환하지만, 한 사용자당 한 방 정책에 따라 프론트 state는 단건으로 관리한다.

```ts
export type CurrentGameRoomState = {
  currentRoom: CurrentGameRoom | null;
  duplicateRoomWarning: boolean;
};
```

## 13. 초대 상태 설계

초대 상태는 `GET /game-room-participants`를 사용해 조회한다.

```ts
export type GameRoomParticipant = {
  participantId: string;
  gameRoomId: string;
  gameRoomTitle: string;
  userId: string;
  nickname: string;
  role: ParticipantRole;
  status: MembershipStatus;
  roomStatus: GameRoomStatus;
  createdAt: string;
};
```

### Frontend Handling

- `status = INVITED` 항목을 초대 카드로 표시한다.
- 사용자가 수락하면 AI 채팅 메시지로 초대 수락 의도를 전송한다.
- 사용자가 거절하면 AI 채팅 메시지로 초대 거절 의도를 전송한다.
- `ROOM_JOIN` 성공 시 MainPage 안에서 참가 완료 상태와 room waiting UI를 표시한다.
- `USER_INVITE_DENY` 성공 시 초대 카드를 제거한다.

## 14. AI Chat 설계

### AI Chat Session

```ts
export type AiChatSession = {
  aiChatSessionId: string;
  requesterUserId: string;
  gameRoomId: string | null;
  status: AiChatSessionStatus;
  provider: string;
  llmModel: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
};
```

### AI Chat Message

```ts
export type AiChatMessage = {
  messageId: string;
  aiChatRequestId: string | null;
  senderType: AiChatMessageSenderType;
  messageType: AiChatMessageType;
  content: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};
```

### Send Message

v1.2에서 메시지 전송 body는 `message`만 포함한다. 이전 명세의 `clientAction`은 제거되었으므로, 선택/확정/수락/거절 의도는 사용자 메시지로 서버에 전달한다.

```ts
export type SendAiChatMessageRequest = {
  message: string;
};
```

```ts
export type AiChatCommandResult = {
  commandType: AiChatRequestType;
  status: RoomCommandStatus;
  apiPath: string | null;
  gameRoomId: string | null;
  title: string | null;
  participants: string[] | null;
  started: boolean | null;
};

export type SendAiChatMessageResponse = {
  aiChatRequestId: string;
  requestType: AiChatRequestType;
  requestStatus: AiChatRequestStatus;
  userMessage?: AiChatMessage;
  assistantMessage?: AiChatMessage;
  commandResult: AiChatCommandResult | null;
};
```

### AI Chat Session 선택

`GET /ai-chat-sessions`는 배열을 반환한다. 프론트는 다음 순서로 active session을 선택한다.

1. `status = ACTIVE`이고 현재 `gameRoomId`와 연결된 세션
2. `status = ACTIVE`인 가장 최근 세션
3. 세션이 없으면 세션 생성 정책 확인 필요

v1.2 명세에는 AI chat session 생성 API가 별도로 없다. 세션이 없는 최초 진입 상태에서 어떤 API로 세션을 생성하는지 백엔드 확인이 필요하다.

## 15. AI Chat 명령 처리 규칙

프론트는 다음 값을 기준으로 화면을 갱신한다.

- `requestType`
- `commandResult.status`
- `commandResult.apiPath`
- `commandResult.gameRoomId`
- `assistantMessage.metadata`

### ROOM_CREATE

`commandResult.status = PENDING`이고 `assistantMessage.metadata.templates`가 있으면 미션 템플릿 선택 UI를 표시한다.

방 생성이 완료되어 `commandResult.status = SUCCESS`와 `gameRoomId`가 반환되면 MainPage에 현재 방 상태를 저장하고 room waiting UI를 표시한다.

룸 생성 실패 시 AI 채팅으로 실패 메시지를 출력한다.

### USER_INVITE

초대가 성공하면 `participants`와 `gameRoomId`를 기준으로 초대 완료 메시지를 표시한다.

이후 참가자 변경은 `room-participants-updated` 이벤트 또는 현재 방 상태 재조회로 반영한다.

### ROOM_JOIN

초대 수락이 성공하면 초대 카드를 제거하고, MainPage 안에 참가 완료 상태와 room waiting UI를 표시한다.

### USER_INVITE_DENY

초대 거절이 성공하면 해당 초대 카드를 제거하고, 필요하면 AI 채팅 메시지로 거절 완료 상태를 표시한다.

### GAME_START

`commandResult.status = SUCCESS`와 `started = true`가 반환되면 Socket.IO의 `game-started` 이벤트를 기다린다.

AI 채팅의 `GAME_START` 응답은 시작 요청 완료 상태로 보고, 실제 게임 화면 전환과 초기 게임 상태 반영은 Socket.IO 이벤트를 기준으로 한다.

## 16. MainPage Room Waiting State 설계

MainPage는 별도 LobbyPage로 이동하지 않고, AI 채팅 화면 안에서 게임 시작 전 참가자 상태와 시작 가능 여부를 표시한다.

### 상태 진입 조건

- AI 채팅으로 방 생성 완료
- AI 채팅으로 초대 수락 완료
- MainPage 초기화 중 `GET /game-rooms`에서 `WAITING` 방 확인
- Socket.IO `room-participants-updated` 수신

### 표시 정보

- 방 제목
- 현재 방 상태
- 현재 참가자 수
- 최소/최대 참가자 수
- 내 역할
- 내 참가 상태
- 참가자별 참가 상태
- 최근 참가자 변경 메시지
- 방장에게 노출되는 게임 시작 액션

### Room Waiting 타입

```ts
export type RoomWaitingState = {
  currentRoom: CurrentGameRoom;
  participants: RoomWaitingParticipant[];
  changedParticipant: RoomWaitingParticipant | null;
};

export type RoomWaitingParticipant = {
  userId: string;
  nickname: string;
  role: ParticipantRole;
  membershipStatus: MembershipStatus;
};
```

### 게임 시작 버튼 조건

```ts
const canShowStartButton = currentRoom.myRole === "OWNER";

const canClickStartButton =
  canShowStartButton &&
  currentRoom.status === "WAITING" &&
  currentRoom.joinedParticipantCount >= currentRoom.minParticipants;
```

## 17. 게임 시작 API 설계

게임 시작은 다음 API로 요청한다.

```txt
POST /game-rooms/{gameRoomId}/start
```

### Request

```ts
export type StartGameRequest = {
  missionTemplateId?: string;
};
```

`missionTemplateId`는 AI 채팅 단계에서 이미 템플릿이 확정된 경우 생략할 수 있다.

### Response

```ts
export type StartGameResponse = {
  success: boolean;
};
```

### Frontend Handling

- 성공 응답만으로 게임 화면 상태를 구성하지 않는다.
- 성공 후 Socket.IO의 `game-started` 이벤트를 기다린다.
- `game-started.uiHints.enterGameScreen = true`이면 `/rooms/:gameRoomId/play`로 이동한다.
- `game-started.uiHints.showMissionGuideModal = true`이면 미션 안내 모달을 표시한다.

## 18. RoomPage 설계

RoomPage는 실제 게임 플레이 화면이다.

### UI 구성

- 게임 상태 헤더
- 미션 제목
- 미션 설명
- 난이도
- 언어
- 현재 턴 번호
- 현재 플레이어
- 남은 시간
- 스트라이크 수
- 파일 탭
- Monaco Editor
- 턴 제출 버튼
- 힌트 버튼
- 턴 판정 결과 패널
- 최종 미션 결과 패널
- 참가자 상태 패널

### 게임 상태 타입

```ts
export type GameState = {
  status: GameRoomStatus;
  strikeCount: number;
  maxStrikeCount: number;
  turnState?: TurnState;
};

export type TurnState = {
  turnId: string;
  turnNumber: number;
  currentPlayerId: string;
  startedAt: string;
  deadlineAt: string;
  timeLimitSeconds: number;
  remainingTimeSeconds: number;
  status: TurnStatus;
};

export type MissionState = {
  missionId: string;
  missionTemplateId?: string;
  gameRoomMissionStepId?: string;
  missionTemplateStepId?: string;
  title?: string;
  description?: string;
  language?: string;
  difficulty?: string;
  status?: string;
};
```

v1.2의 `game-started` 예시에는 `projectStructure.files`가 포함되어 있지 않다. 에디터 파일 탭 구성을 위해 별도 초기 파일 정보가 Socket.IO 이벤트에 포함되는지 확인이 필요하다.

## 19. 에디터 설계

### 편집 가능 조건

```ts
const canEdit =
  gameState.turnState?.currentPlayerId === authUser.userId &&
  gameState.turnState.status === "IN_PROGRESS";
```

### 코드 스냅샷

턴 제출 시 전체 파일 내용을 snapshot으로 만든다.

```ts
export type CodeSnapshot = {
  files: CodeSnapshotFile[];
};

export type CodeSnapshotFile = {
  filePath: string;
  content: string;
};
```

### 실시간 코드 동기화

- 로컬 변경은 Monaco model change event를 기준으로 감지한다.
- 변경분을 `code-change` payload로 직렬화해 Socket.IO로 전송한다.
- `code-updated` 수신 시 본인이 보낸 변경이 아니면 editor document에 적용한다.
- 현재 연결의 `socket.id` 또는 별도 client change id를 기준으로 중복 반영을 방지한다.

## 20. 힌트 API 설계

현재 미션의 현재 단계 힌트는 다음 API로 조회한다.

```txt
GET /game-room-missions/{missionId}/hints?scope=current-step
```

### Response

```ts
export type HintResponse = {
  missionId: string;
  gameRoomMissionStepId: string;
  missionTemplateStepId: string;
  hintText: string;
};
```

### Frontend Handling

- 현재 단계에 연결된 힌트를 표시한다.
- 힌트 팝업 또는 AI 채팅 메시지 형태로 출력한다.
- 사용자가 힌트를 조회한 기록을 상태에 저장한다.
- 동일 `gameRoomMissionStepId`에 대해서는 중복 요청하지 않도록 cache한다.

## 21. Socket.IO 설계

### 연결 생명주기

1. MainPage에서 방 상태가 확인되면 Socket.IO를 연결한다.
2. 연결 성공 후 `join-room` 이벤트를 전송한다.
3. `room-participants-updated`로 참가자 상태를 동기화한다.
4. `game-started`로 초기 게임 상태와 미션 상태를 저장한다.
5. `code-change`, `turn-submit` 이벤트를 송신한다.
6. 서버 이벤트를 받아 editor, game, turn, result state를 갱신한다.
7. 페이지 이탈 시 연결을 종료한다.

### 재연결 정책

- 비정상 종료 시 최대 5회 재연결한다.
- 재연결 간격은 exponential backoff를 사용한다.
- 재연결 성공 시 `join-room`을 다시 전송한다.
- 재연결 중에는 에디터를 임시 read-only로 전환한다.
- 재연결 실패 시 사용자에게 새로고침 또는 재입장 안내를 표시한다.

## 22. Client to Server Socket.IO Events

### join-room

```ts
export type JoinRoomEvent = {
  accessToken: string;
  gameRoomId: string;
  userId: string;
};
```

### code-change

```ts
export type CodeChangeEvent = {
  gameRoomId: string;
  userId: string;
  sessionId: string;
  filePath: string;
  codeDelta: string;
  occurredAt: string;
};
```

`sessionId`는 현재 클라이언트 연결 또는 변경 출처를 식별하기 위한 값으로 사용한다. Socket.IO 사용 시 `socket.id`를 그대로 사용하거나, 별도 `clientChangeId` 정책이 있으면 백엔드와 합의해 대체한다.

### turn-submit

```ts
export type TurnSubmitEvent = {
  gameRoomId: string;
  userId: string;
  turnId: string;
  codeSnapshot: CodeSnapshot;
  submittedAt: string;
};
```

## 23. Server to Client Socket.IO Events

### room-participants-updated

```ts
export type RoomParticipantsUpdatedEvent = {
  gameRoomId: string;
  participants: RoomWaitingParticipant[];
  changedParticipant: RoomWaitingParticipant | null;
  gameState: {
    status: GameRoomStatus;
    strikeCount: number;
    maxStrikeCount: number;
  };
  missionState: MissionState | null;
  occurredAt: string;
};
```

처리:

- 참가자 목록을 저장한다.
- `membershipStatus`는 `INVITED`, `JOINED`, `LEFT`, `DENIED` 값을 사용한다.
- `changedParticipant`를 기준으로 최근 참가 상태 변경 메시지를 표시한다.
- `gameState.status = WAITING`이면 MainPage의 room waiting UI를 유지한다.

### game-started

```ts
export type GameStartedEvent = {
  gameRoomId: string;
  gameState: GameState;
  missionState: MissionState;
  uiHints: {
    enterGameScreen: boolean;
    showMissionGuideModal: boolean;
  };
  occurredAt: string;
};
```

처리:

- 게임 화면으로 전환한다.
- gameState와 missionState를 저장한다.
- 미션 안내 모달 표시 여부를 반영한다.
- 현재 턴 사용자와 타이머를 초기화한다.

### code-updated

```ts
export type CodeUpdatedEvent = {
  gameRoomId: string;
  userId: string;
  filePath: string;
  codeDelta: string;
  occurredAt: string;
};
```

처리:

- 다른 참가자의 코드 변경분을 에디터에 반영한다.
- 내가 보낸 변경분은 중복 적용하지 않는다.

### turn-evaluated

```ts
export type TurnEvaluatedEvent = {
  gameRoomId: string;
  evaluatedTurn: {
    turnId: string;
    turnNumber: number;
    playerUserId: string;
    status: TurnStatus;
  };
  evaluationResult: {
    isStepCleared: boolean;
    judgeStatus: string;
    strikeCount: number;
    remainingStrikeCount: number;
    feedbackMessage: string;
    detectedIssues: DetectedIssue[];
    executionSummary: {
      status: ExecutionStatus;
      exitCode: number;
      stdout: string;
      stderr: string;
    };
  };
  occurredAt: string;
};

export type DetectedIssue = {
  issueType: string;
  message: string;
  filePath: string;
  lineNumber: number;
};
```

처리:

- 방금 종료된 턴의 검증 결과를 표시한다.
- 실패면 피드백, 스트라이크 수, 오류 위치를 갱신한다.
- 성공이면 현재 단계 완료 상태를 반영한다.
- 이 이벤트는 다음 턴 시작 전, 방금 제출된 턴의 검증 결과로 처리한다.

### turn-changed

```ts
export type TurnChangedEvent = {
  gameRoomId: string;
  missionState: MissionState;
  turnState: TurnState;
  nextPlayerId: string;
  turnSnapshotId: string;
};
```

처리:

- 현재 턴 사용자를 변경한다.
- `currentPlayerId`와 내 `userId`가 같으면 에디터를 활성화한다.
- 그렇지 않으면 읽기 전용으로 전환한다.
- 타이머를 초기화한다.
- 이전 턴 검증 완료 이후 실제로 다음 턴이 시작되었음을 의미한다.

### game-state-updated

```ts
export type GameStateUpdatedEvent = {
  gameRoomId: string;
  gameState: GameState;
  missionState?: MissionState | null;
};
```

처리:

- 게임 상태를 갱신한다.
- 스트라이크 UI를 갱신한다.
- missionState가 있으면 미션 상태를 갱신한다.
- `status = FINISHED`이면 결과 화면 이동을 준비한다.

### mission-result

```ts
export type MissionResultEvent = {
  gameRoomId: string;
  gameState: {
    status: GameRoomStatus;
  };
  missionResult: {
    missionId: string;
    isMissionCleared: boolean;
    judgeStatus: string;
    selectedInputs: unknown[][];
    expectedOutputs: unknown[][];
    actualOutputs: unknown[][];
    strikeCount: number;
    remainingStrikeCount: number;
    feedbackMessage: string;
    detectedIssues: DetectedIssue[];
  };
};
```

처리:

- 최종 미션 성공 또는 실패 결과를 표시한다.
- 결과 화면으로 이동한다.
- 실패 시 최종 남은 목숨과 누적 판정 결과를 표시한다.
- `detectedIssues`가 있으면 최종 실패 원인으로 표시한다.
- 이 이벤트는 개별 턴 판정이 아니라 게임 종료 시점의 최종 미션 판정이다.

## 24. 상태 관리 설계

### TanStack Query로 관리할 서버 상태

- 닉네임 중복 확인
- 회원가입
- 로그인
- token refresh
- 현재 게임방 상태 조회
- 초대 상태 조회
- AI chat session 조회
- AI chat messages 조회
- AI chat message 전송
- 게임 시작 요청
- 힌트 조회

### Zustand로 관리할 클라이언트 상태

```ts
export type RootClientState = {
  auth: AuthState;
  aiChat: AiChatClientState;
  room: RoomClientState;
  game: GameClientState;
  editor: EditorClientState;
  realtime: RealtimeClientState;
};

export type AiChatClientState = {
  activeSessionId: string | null;
  messages: AiChatMessage[];
  pendingCommand: AiChatCommandResult | null;
};

export type RoomClientState = {
  currentRoom: CurrentGameRoom | null;
  invitations: GameRoomParticipant[];
  roomWaitingState: RoomWaitingState | null;
};

export type GameClientState = {
  gameState: GameState | null;
  missionState: MissionState | null;
  lastTurnEvaluation: TurnEvaluatedEvent["evaluationResult"] | null;
  missionResult: MissionResultEvent["missionResult"] | null;
};

export type EditorClientState = {
  files: Record<string, string>;
  activeFilePath: string | null;
  markers: DetectedIssue[];
};

export type RealtimeClientState = {
  connectionStatus: "idle" | "connecting" | "connected" | "reconnecting" | "closed" | "error";
  socketId: string | null;
  participants: RoomWaitingParticipant[];
};
```

## 25. 타이머 설계

- `deadlineAt`을 기준으로 남은 시간을 계산한다.
- `remainingTimeSeconds`는 초기 표시값으로 사용한다.
- 클라이언트 타이머는 화면 표시용이다.
- 서버 이벤트의 turn state를 authoritative source로 사용한다.
- `turn-changed` 수신 시 타이머를 재시작한다.
- 시간이 0이 되면 에디터를 비활성화하고 서버 이벤트를 기다린다.

## 26. 에러 처리 설계

```ts
export const errorMessageMap: Record<string, string> = {
  VALIDATION_ERROR: "입력값을 확인해주세요.",
  UNAUTHORIZED: "로그인이 필요합니다.",
  FORBIDDEN_RESOURCE_ACCESS: "접근 권한이 없습니다.",
  INTERNAL_SERVER_ERROR: "서버 오류가 발생했습니다.",
  AUTH_LOGIN_ID_CONFLICT: "이미 사용 중인 아이디입니다.",
  AUTH_EMAIL_CONFLICT: "이미 사용 중인 이메일입니다.",
  AUTH_NICKNAME_CONFLICT: "이미 사용 중인 닉네임입니다.",
  AUTH_INVALID_CREDENTIALS: "아이디 또는 비밀번호가 올바르지 않습니다.",
  AUTH_TOKEN_INVALID: "인증 정보가 올바르지 않습니다.",
  AUTH_TOKEN_EXPIRED: "로그인이 만료되었습니다.",
  AUTH_REFRESH_TOKEN_REVOKED: "다시 로그인해주세요.",
  AI_CHAT_SESSION_NOT_FOUND: "AI 채팅 세션을 찾을 수 없습니다.",
  AI_CHAT_REQUEST_NOT_FOUND: "AI 요청을 찾을 수 없습니다.",
  AI_CHAT_COMMAND_NOT_SUPPORTED: "지원하지 않는 명령입니다.",
  AI_CHAT_COMMAND_EXECUTION_FAILED: "명령을 처리하지 못했습니다.",
  INVITATION_NOT_FOUND: "초대를 찾을 수 없습니다.",
  INVITATION_ALREADY_PROCESSED: "이미 처리된 초대입니다.",
  ROOM_INVITE_FORBIDDEN: "초대 권한이 없습니다.",
  USER_NOT_FOUND: "사용자를 찾을 수 없습니다.",
  USER_ALREADY_IN_ROOM: "이미 방에 참여 중인 사용자입니다.",
  ROOM_NOT_FOUND: "방을 찾을 수 없습니다.",
  ROOM_ALREADY_JOINED: "이미 참가한 방입니다.",
  ROOM_START_FORBIDDEN: "게임을 시작할 권한이 없습니다.",
  ROOM_START_CONDITION_NOT_MET: "게임 시작 조건이 충족되지 않았습니다.",
  GAME_ROOM_NOT_FOUND: "게임방을 찾을 수 없습니다.",
  MISSION_NOT_FOUND: "미션을 찾을 수 없습니다.",
  TURN_NOT_FOUND: "현재 턴을 찾을 수 없습니다.",
  AI_HINT_NOT_AVAILABLE: "현재 사용할 수 있는 힌트가 없습니다.",
};
```

### 화면별 에러 처리

- 로그인/회원가입: field error 또는 form level error로 표시한다.
- MainPage: AI assistant message 영역 또는 toast로 표시한다.
- Room waiting state: retry 가능한 error state를 표시한다.
- RoomPage: 턴 판정 오류는 결과 패널에 표시하고, 시스템 오류는 toast로 표시한다.
- Socket.IO 오류: 상단 연결 상태 indicator로 표시한다.

## 27. 로딩, 빈 상태, 재시도 정책

### Auth

- 로그인 제출 중 버튼을 비활성화한다.
- 닉네임 중복 확인 중 spinner를 표시한다.
- 회원가입 실패 시 충돌 필드에 메시지를 표시한다.

### MainPage

- 초기 상태 조회 중 skeleton을 표시한다.
- AI 세션 또는 메시지 조회 중 채팅 skeleton을 표시한다.
- 메시지 전송 중 입력창을 비활성화하거나 pending 상태를 표시한다.
- 현재 방과 초대가 없으면 AI 채팅 기반 방 생성 유도 UI를 표시한다.

### Room Waiting State

- 참가자 상태 조회 중 skeleton을 표시한다.
- 조회 실패 시 retry 버튼을 표시한다.
- 참가자 변경은 채팅 메시지 또는 상태 카드로 표시한다.

### RoomPage

- 게임 상태 로딩 중 editor skeleton을 표시한다.
- Socket.IO 재연결 중 read-only 상태를 표시한다.
- 턴 제출 후 `turn-evaluated` 수신 전까지 제출 pending 상태를 표시한다.
- `turn-evaluated` 수신 후 결과 패널을 표시한다.
- `turn-changed` 수신 후 다음 턴 UI로 전환한다.

## 28. 네비게이션 규칙

```txt
login success
  -> /main

signup success
  -> /login 또는 /main

no current room and no invitation
  -> stay on /main and show AI room creation flow

room create success
  -> stay on /main and show room waiting state

room join success
  -> stay on /main and show room waiting state

current room status WAITING
  -> stay on /main and show room waiting state

current room status IN_PROGRESS
  -> show re-entry CTA or navigate to /rooms/:gameRoomId/play

game-started with enterGameScreen
  -> /rooms/:gameRoomId/play

mission-result
  -> /rooms/:gameRoomId/result

auth refresh failed
  -> /login
```

## 29. 보안 고려사항

- 인증 API를 제외한 모든 API 요청에는 access token을 포함한다.
- Socket.IO 연결 시 accessToken을 전송하므로 운영 환경에서는 TLS가 적용된 endpoint를 사용한다.
- 프론트에서 전달하는 `userId`는 서버에서 신뢰하지 않아야 한다.
- 코드 제출 권한은 서버가 현재 턴 사용자 기준으로 검증해야 한다.
- refresh token 저장 방식은 보안 정책 확정이 필요하다.
- 클라이언트 password hashing 정책은 반드시 백엔드와 합의해야 한다.

## 30. 테스트 전략

### Unit Test

- API response unwrap
- API error 변환
- token refresh retry
- error code mapping
- 현재 게임방 배열의 zero-or-one 해석
- AI chat command 분기
- edit permission 계산
- timer 계산
- Socket.IO event reducer

### Component Test

- LoginForm
- SignupForm
- ChatPanel
- ChatMessageList
- InvitationCard
- RoomWaitingStatus
- RoomWaitingParticipantList
- GameHeader
- TurnIndicator
- TurnTimer
- CodeEditor
- TurnEvaluationPanel
- MissionResultPanel

### Integration Test

- 로그인 성공
- token 만료 후 refresh 성공
- refresh 실패 후 로그인 이동
- MainPage 초기 상태 조회
- 현재 방 없음 상태에서 AI 방 생성 flow 표시
- 초대 목록 조회 후 초대 카드 표시
- 초대 수락 후 MainPage room waiting state 표시
- `GET /game-rooms` 응답이 1개일 때 현재 방 state 저장
- `GET /game-rooms` 응답이 2개 이상일 때 duplicate warning 처리
- `game-started` 수신 후 play 이동
- `turn-evaluated` 수신 후 판정 결과 표시
- `turn-changed` 수신 후 편집 권한 변경
- `mission-result` 수신 후 result 이동

### E2E Test

- 로그인
- 메인 진입
- AI 채팅으로 방 생성
- MainPage에서 참가자 대기 상태 확인
- 초대 수락 사용자 입장 확인
- 게임 시작
- 게임 화면 진입
- 코드 수정
- 턴 제출
- 턴 판정 결과 확인
- 다음 턴 전환 확인
- 최종 미션 결과 확인

## 31. 구현 마일스톤

### Phase 1. Foundation

- 프로젝트 세팅
- 라우터 구성
- provider 구성
- API client 구성
- 공통 타입 정의
- 공통 에러 처리

### Phase 2. Auth

- 로그인 화면
- 회원가입 화면
- 닉네임 중복 확인
- token 저장
- token refresh
- route guard

### Phase 3. MainPage Initial State

- 현재 게임방 상태 조회
- 한 사용자당 한 방 정책 반영
- 초대 상태 조회
- AI chat session 조회
- AI chat messages 조회

### Phase 4. Main AI Chat

- AI chat message 전송
- ROOM_CREATE flow UI
- USER_INVITE flow UI
- ROOM_JOIN flow UI
- USER_INVITE_DENY flow UI
- GAME_START flow UI

### Phase 5. MainPage Room Waiting State

- room waiting 상태 표시
- 참가자 목록 UI
- 참가자 변경 메시지
- 게임 시작 버튼
- start game API

### Phase 6. RoomPage

- Socket.IO 연결
- game-started 처리
- mission state 렌더링
- game state 렌더링
- Monaco Editor 연동
- 파일 탭
- 힌트 조회

### Phase 7. Realtime Gameplay

- join-room
- room-participants-updated
- code-change / code-updated
- turn-submit
- turn-evaluated
- turn-changed
- game-state-updated
- mission-result

### Phase 8. QA

- MSW 기반 integration test
- Playwright E2E
- 에러 상태 점검
- 로딩 상태 점검
- 빈 상태 점검