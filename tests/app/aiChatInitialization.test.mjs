import test from "node:test";
import assert from "node:assert/strict";
import { createAiChatApi } from "../../src/features/ai-chat/aiChatApi.ts";
import {
  derivePendingAiChatCommand,
  syncSentAiChatResponse,
} from "../../src/features/ai-chat/aiChatMessage.ts";
import { selectActiveAiChatSession } from "../../src/features/ai-chat/aiChatSession.ts";
import {
  deriveMainChatComposerView,
  deriveMainPageAiChatView,
  loadAiChatMessages,
  loadAiChatSessions,
  syncAiChatMessages,
  syncAiChatSessionSelection,
} from "../../src/pages/MainPage/aiChatInitialization.ts";
import { AppError } from "../../src/shared/utils/appError.ts";

function createSession(overrides = {}) {
  return {
    aiChatSessionId: "session-1",
    requesterUserId: "user-1",
    gameRoomId: null,
    status: "ACTIVE",
    provider: "openai",
    llmModel: "gpt-5.4",
    createdAt: "2026-05-25T12:00:00Z",
    updatedAt: "2026-05-25T12:05:00Z",
    closedAt: null,
    ...overrides,
  };
}

function createMessage(overrides = {}) {
  return {
    messageId: "message-1",
    aiChatRequestId: null,
    senderType: "ASSISTANT",
    messageType: "TEXT",
    content: "안녕하세요!",
    metadata: null,
    createdAt: "2026-05-25T12:05:00Z",
    ...overrides,
  };
}

function createCurrentRoom(overrides = {}) {
  return {
    gameRoomId: "room-1",
    status: "WAITING",
    difficulty: "NORMAL",
    ownerUserId: "owner-1",
    myRole: "OWNER",
    myMembershipStatus: "JOINED",
    joinedParticipantCount: 1,
    timeLimitSeconds: 30,
    maxStrikeCount: 3,
    minParticipants: 2,
    maxParticipants: 4,
    createdAt: "2026-05-25T10:00:00Z",
    updatedAt: "2026-05-25T10:05:00Z",
    ...overrides,
  };
}

function createCommandResult(overrides = {}) {
  return {
    commandType: "ROOM_CREATE",
    status: "PENDING",
    apiPath: "/game-rooms",
    gameRoomId: null,
    participants: null,
    started: null,
    ...overrides,
  };
}

function createSendResponse(overrides = {}) {
  return {
    aiChatRequestId: "request-1",
    requestType: "ROOM_CREATE",
    requestStatus: "RECEIVED",
    userMessage: createMessage({
      messageId: "message-user-1",
      senderType: "USER",
      content: "방 만들어줘",
    }),
    assistantMessage: createMessage({
      messageId: "message-assistant-1",
      content: "난이도를 골라주세요.",
    }),
    commandResult: createCommandResult(),
    ...overrides,
  };
}

test("createAiChatApi requests sessions by user ID", async () => {
  const calls = [];
  const api = createAiChatApi({
    async get(path, options) {
      calls.push({ path, options });
      return [createSession()];
    },
  });

  const result = await api.getSessions("user 1");

  assert.equal(result.length, 1);
  assert.deepEqual(calls, [
    {
      path: "/ai-chat-sessions?userId=user%201",
      options: undefined,
    },
  ]);
});

test("createAiChatApi requests messages only for the selected session", async () => {
  const calls = [];
  const api = createAiChatApi({
    async get(path, options) {
      calls.push({ path, options });
      return [createMessage()];
    },
  });

  const result = await api.getMessages("session 1");

  assert.equal(result.length, 1);
  assert.deepEqual(calls, [
    {
      path: "/ai-chat-sessions/session%201/messages",
      options: undefined,
    },
  ]);
});

test("createAiChatApi sends only the message field for ai chat submission", async () => {
  const calls = [];
  const api = createAiChatApi({
    async get() {
      return null;
    },
    async post(path, body, options) {
      calls.push({ path, body, options });
      return createSendResponse();
    },
  });

  const result = await api.sendMessage("session 1", {
    message: "방 만들어줘",
    clientAction: "ROOM_CREATE",
  });

  assert.equal(result.aiChatRequestId, "request-1");
  assert.deepEqual(calls, [
    {
      path: "/ai-chat-sessions/session%201/messages",
      body: {
        message: "방 만들어줘",
      },
      options: undefined,
    },
  ]);
});

test("selectActiveAiChatSession prefers the active session tied to the current room", () => {
  const roomSession = createSession({
    aiChatSessionId: "session-room",
    gameRoomId: "room-1",
    updatedAt: "2026-05-25T12:01:00Z",
  });
  const fallbackSession = createSession({
    aiChatSessionId: "session-latest",
    gameRoomId: null,
    updatedAt: "2026-05-25T12:09:00Z",
  });

  const result = selectActiveAiChatSession({
    sessions: [fallbackSession, roomSession],
    currentRoomId: "room-1",
  });

  assert.equal(result?.aiChatSessionId, "session-room");
});

test("selectActiveAiChatSession prefers the most recent active session when multiple room-linked sessions exist", () => {
  const olderRoomSession = createSession({
    aiChatSessionId: "session-room-older",
    gameRoomId: "room-1",
    updatedAt: "2026-05-25T12:01:00Z",
  });
  const latestRoomSession = createSession({
    aiChatSessionId: "session-room-latest",
    gameRoomId: "room-1",
    updatedAt: "2026-05-25T12:09:00Z",
  });

  const result = selectActiveAiChatSession({
    sessions: [olderRoomSession, latestRoomSession],
    currentRoomId: "room-1",
  });

  assert.equal(result?.aiChatSessionId, "session-room-latest");
});

test("selectActiveAiChatSession falls back to the most recent active session when no room session exists", () => {
  const olderSession = createSession({
    aiChatSessionId: "session-older",
    updatedAt: "2026-05-25T12:01:00Z",
  });
  const latestSession = createSession({
    aiChatSessionId: "session-latest",
    updatedAt: "2026-05-25T12:09:00Z",
  });

  const result = selectActiveAiChatSession({
    sessions: [olderSession, latestSession],
    currentRoomId: "room-2",
  });

  assert.equal(result?.aiChatSessionId, "session-latest");
});

test("selectActiveAiChatSession ignores closed or error sessions", () => {
  const result = selectActiveAiChatSession({
    sessions: [
      createSession({
        aiChatSessionId: "closed-session",
        status: "CLOSED",
      }),
      createSession({
        aiChatSessionId: "error-session",
        status: "ERROR",
      }),
    ],
    currentRoomId: null,
  });

  assert.equal(result, null);
});

test("loadAiChatSessions delegates to the ai chat API dependency", async () => {
  const result = await loadAiChatSessions({
    userId: "user-1",
    async getSessions(userId) {
      assert.equal(userId, "user-1");
      return [createSession()];
    },
  });

  assert.equal(result.length, 1);
});

test("loadAiChatMessages delegates to the message API dependency", async () => {
  const result = await loadAiChatMessages({
    aiChatSessionId: "session-1",
    async getMessages(aiChatSessionId) {
      assert.equal(aiChatSessionId, "session-1");
      return [createMessage()];
    },
  });

  assert.equal(result.length, 1);
});

test("deriveMainPageAiChatView loads the message list for the selected active session", () => {
  const selectedSession = createSession({
    aiChatSessionId: "session-room",
    gameRoomId: "room-1",
  });
  const ignoredSession = createSession({
    aiChatSessionId: "session-other",
    updatedAt: "2026-05-25T12:09:00Z",
  });
  const message = createMessage({
    messageId: "message-room",
    content: "현재 방과 연결된 세션 메시지",
  });

  const view = deriveMainPageAiChatView({
    currentRoom: createCurrentRoom(),
    invitations: [],
    sessionQuery: {
      data: [ignoredSession, selectedSession],
      error: null,
      isPending: false,
    },
    messageQuery: {
      data: [message],
      error: null,
      isPending: false,
    },
  });

  assert.equal(view.status, "ready");
  assert.equal(view.activeSession?.aiChatSessionId, "session-room");
  assert.deepEqual(view.messages, [message]);
});

test("deriveMainPageAiChatView shows the AI-led empty prompt when no room, invitation, or active session exists", () => {
  const view = deriveMainPageAiChatView({
    currentRoom: null,
    invitations: [],
    sessionQuery: {
      data: [],
      error: null,
      isPending: false,
    },
    messageQuery: {
      data: undefined,
      error: null,
      isPending: false,
    },
  });

  assert.equal(view.status, "ready");
  assert.equal(view.activeSession, null);
  assert.equal(view.shouldShowEmptyPrompt, true);
});

test("deriveMainPageAiChatView keeps room initialization visible while session loading fails", () => {
  const view = deriveMainPageAiChatView({
    currentRoom: createCurrentRoom(),
    invitations: [],
    sessionQuery: {
      data: undefined,
      error: new AppError({
        code: "INTERNAL_SERVER_ERROR",
        message: "failed to load sessions",
        status: 500,
      }),
      isPending: false,
    },
    messageQuery: {
      data: undefined,
      error: null,
      isPending: false,
    },
  });

  assert.equal(view.status, "ready");
  assert.equal(view.sessionErrorMessage, "A server error occurred.");
  assert.equal(view.shouldShowEmptyPrompt, false);
});

test("deriveMainPageAiChatView stays loading until the selected session messages are ready", () => {
  const session = createSession({
    aiChatSessionId: "session-room",
    gameRoomId: "room-1",
  });

  const view = deriveMainPageAiChatView({
    currentRoom: createCurrentRoom(),
    invitations: [],
    sessionQuery: {
      data: [session],
      error: null,
      isPending: false,
    },
    messageQuery: {
      data: undefined,
      error: null,
      isPending: true,
    },
  });

  assert.equal(view.status, "loading");
});

test("deriveMainChatComposerView keeps the composer enabled while chat history is still loading", () => {
  assert.deepEqual(
    deriveMainChatComposerView({
      activeSessionId: "session-room",
      isAiChatLoading: true,
      isSendPending: false,
    }),
    {
      disabled: false,
      placeholder: "이전 대화를 불러오는 중이에요. 메시지는 바로 보낼 수 있어요.",
    },
  );
});

test("deriveMainChatComposerView disables the composer when there is no active session", () => {
  assert.deepEqual(
    deriveMainChatComposerView({
      activeSessionId: null,
      isAiChatLoading: false,
      isSendPending: false,
    }),
    {
      disabled: true,
      placeholder: "활성 채팅 세션을 불러오는 중이에요.",
    },
  );
});

test("syncAiChatSessionSelection clears stale messages when the active session changes", () => {
  const nextState = syncAiChatSessionSelection({
    previousState: {
      activeSessionId: "session-old",
      messages: [createMessage()],
      pendingCommand: createCommandResult(),
      pendingRequestId: "request-old",
    },
    activeSessionId: "session-new",
  });

  assert.deepEqual(nextState, {
    activeSessionId: "session-new",
    messages: [],
    pendingCommand: null,
    pendingRequestId: null,
  });
});

test("syncAiChatMessages stores the hydrated message baseline for the selected session", () => {
  const messages = [createMessage(), createMessage({ messageId: "message-2" })];
  const nextState = syncAiChatMessages({
    previousState: {
      activeSessionId: null,
      messages: [],
      pendingCommand: null,
      pendingRequestId: null,
    },
    activeSessionId: "session-1",
    messages,
  });

  assert.deepEqual(nextState, {
    activeSessionId: "session-1",
    messages,
    pendingCommand: null,
    pendingRequestId: null,
  });
});

test("syncAiChatMessages returns the previous state when session and messages are unchanged", () => {
  const previousState = {
    activeSessionId: "session-1",
    messages: [createMessage()],
    pendingCommand: null,
    pendingRequestId: null,
  };

  const nextState = syncAiChatMessages({
    previousState,
    activeSessionId: "session-1",
    messages: [createMessage()],
  });

  assert.equal(nextState, previousState);
});

test("derivePendingAiChatCommand keeps ROOM_CREATE pending state for staged follow-up UI", () => {
  const response = createSendResponse();

  assert.deepEqual(derivePendingAiChatCommand(response), createCommandResult());
});

test("derivePendingAiChatCommand clears pending state after a successful ROOM_JOIN", () => {
  const response = createSendResponse({
    requestType: "ROOM_JOIN",
    requestStatus: "COMPLETED",
    commandResult: createCommandResult({
      commandType: "ROOM_JOIN",
      status: "SUCCESS",
      gameRoomId: "room-1",
    }),
  });

  assert.equal(derivePendingAiChatCommand(response), null);
});

test("derivePendingAiChatCommand clears pending state after a failed GAME_START request", () => {
  const response = createSendResponse({
    requestType: "GAME_START",
    requestStatus: "FAILED",
    commandResult: createCommandResult({
      commandType: "GAME_START",
      status: "FAILED",
      started: false,
    }),
  });

  assert.equal(derivePendingAiChatCommand(response), null);
});

test("syncSentAiChatResponse appends returned chat history and stores the backend pending command", () => {
  const nextState = syncSentAiChatResponse({
    previousState: {
      activeSessionId: "session-1",
      messages: [createMessage({ messageId: "message-history-1", content: "이전 메시지" })],
      pendingCommand: null,
      pendingRequestId: null,
    },
    activeSessionId: "session-1",
    response: createSendResponse(),
  });

  assert.deepEqual(nextState, {
    activeSessionId: "session-1",
    messages: [
      createMessage({ messageId: "message-history-1", content: "이전 메시지" }),
      createMessage({
        messageId: "message-user-1",
        senderType: "USER",
        content: "방 만들어줘",
      }),
      createMessage({
        messageId: "message-assistant-1",
        content: "난이도를 골라주세요.",
      }),
    ],
    pendingCommand: createCommandResult(),
    pendingRequestId: "request-1",
  });
});
