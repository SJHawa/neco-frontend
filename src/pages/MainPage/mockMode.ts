import type {
  AiChatMessage,
  AiChatSession,
  CurrentGameRoom,
  GameRoomParticipant,
  SendAiChatMessageResponse,
} from "../../shared/types/domain";

export const MAIN_PAGE_MOCK_PARAM = "mock";

export type MainPageMockScenario =
  | "room-create"
  | "room-create-delay"
  | "invitation"
  | "invitation-delay";

export const MAIN_PAGE_MOCK_USER = {
  userId: "mock-user-1",
  loginId: "mock-user",
  nickname: "목플레이어",
  email: "mock@example.com",
};

type MockRoomCreateStep =
  | "idle"
  | "waiting-difficulty"
  | "waiting-template"
  | "room-created";

type MockMainPageState = {
  scenario: MainPageMockScenario;
  step: MockRoomCreateStep;
  session: AiChatSession;
  messages: AiChatMessage[];
  currentRoom: CurrentGameRoom | null;
  invitations: GameRoomParticipant[];
  roomParticipants: GameRoomParticipant[];
  currentRoomSyncLag: number;
  currentTemplates: Array<{
    templateId: string;
    title: string;
    description: string;
    difficulty: "EASY" | "NORMAL" | "HARD";
  }>;
};

const mockStates = new Map<string, MockMainPageState>();
let mockInstanceCounter = 0;

function isMainPageMockScenario(value: string | null): value is MainPageMockScenario {
  return (
    value === "room-create" ||
    value === "room-create-delay" ||
    value === "invitation" ||
    value === "invitation-delay"
  );
}

function createIsoTimestamp(offsetMinutes: number) {
  const baseTime = Date.parse("2026-05-25T12:00:00+09:00");

  return new Date(baseTime + offsetMinutes * 60_000).toISOString();
}

function createMockSession(): AiChatSession {
  return {
    aiChatSessionId: "mock-session-room-create",
    requesterUserId: MAIN_PAGE_MOCK_USER.userId,
    gameRoomId: null,
    status: "ACTIVE",
    provider: "openai",
    llmModel: "gpt-5.4",
    createdAt: createIsoTimestamp(0),
    updatedAt: createIsoTimestamp(0),
    closedAt: null,
  };
}

function createMessage({
  messageId,
  aiChatRequestId,
  senderType,
  messageType,
  content,
  metadata,
  createdAt,
}: {
  messageId: string;
  aiChatRequestId: string | null;
  senderType: AiChatMessage["senderType"];
  messageType: AiChatMessage["messageType"];
  content: string;
  metadata?: AiChatMessage["metadata"];
  createdAt: string;
}): AiChatMessage {
  return {
    messageId,
    aiChatRequestId,
    senderType,
    messageType,
    content,
    metadata: metadata ?? null,
    createdAt,
  };
}

function createWelcomeMessage() {
  return createMessage({
    messageId: "mock-message-welcome",
    aiChatRequestId: null,
    senderType: "ASSISTANT",
    messageType: "TEXT",
    content: "목데이터 모드예요. '방 만들어줘'라고 입력하거나 아래 흐름을 눌러서 테스트해보세요.",
    createdAt: createIsoTimestamp(1),
  });
}

function createInvitationWelcomeMessage() {
  return createMessage({
    messageId: "mock-message-invitation-welcome",
    aiChatRequestId: null,
    senderType: "ASSISTANT",
    messageType: "TEXT",
    content:
      "목데이터 모드예요. 도착한 초대장을 카드에서 바로 수락하거나 거절해보세요.",
    createdAt: createIsoTimestamp(1),
  });
}

function createCurrentRoom(): CurrentGameRoom {
  return {
    gameRoomId: "mock-room-1",
    title: "기초 산술 연산 릴레이 방",
    status: "WAITING",
    ownerUserId: MAIN_PAGE_MOCK_USER.userId,
    myRole: "OWNER",
    myMembershipStatus: "JOINED",
    joinedParticipantCount: 1,
    minParticipants: 2,
    maxParticipants: 4,
    createdAt: createIsoTimestamp(8),
    updatedAt: createIsoTimestamp(8),
  };
}

function createJoinedInvitationRoom(): CurrentGameRoom {
  return {
    gameRoomId: "mock-invitation-room-1",
    title: "문자열 핸들링 릴레이 방",
    status: "WAITING",
    ownerUserId: "mock-owner-1",
    myRole: "PARTICIPANT",
    myMembershipStatus: "JOINED",
    joinedParticipantCount: 2,
    minParticipants: 2,
    maxParticipants: 4,
    createdAt: createIsoTimestamp(4),
    updatedAt: createIsoTimestamp(6),
  };
}

function createInvitationParticipant(): GameRoomParticipant {
  return {
    participantId: "mock-invitation-participant-1",
    gameRoomId: "mock-invitation-room-1",
    gameRoomTitle: "문자열 핸들링 릴레이 방",
    userId: "mock-owner-1",
    nickname: "목방장",
    role: "OWNER",
    status: "INVITED",
    roomStatus: "WAITING",
    createdAt: createIsoTimestamp(2),
  };
}

function createRoomParticipant({
  participantId,
  gameRoomId,
  gameRoomTitle,
  userId,
  nickname,
  role,
  status,
}: {
  participantId: string;
  gameRoomId: string;
  gameRoomTitle: string;
  userId: string;
  nickname: string;
  role: GameRoomParticipant["role"];
  status: GameRoomParticipant["status"];
}): GameRoomParticipant {
  return {
    participantId,
    gameRoomId,
    gameRoomTitle,
    userId,
    nickname,
    role,
    status,
    roomStatus: "WAITING",
    createdAt: createIsoTimestamp(6),
  };
}

function createInitialMockState(scenario: MainPageMockScenario): MockMainPageState {
  if (scenario === "invitation" || scenario === "invitation-delay") {
    return {
      scenario,
      step: "idle",
      session: createMockSession(),
      messages: [createInvitationWelcomeMessage()],
      currentRoom: null,
      invitations: [createInvitationParticipant()],
      roomParticipants: [],
      currentRoomSyncLag: 0,
      currentTemplates: [],
    };
  }

  return {
    scenario,
    step: "idle",
    session: createMockSession(),
    messages: [createWelcomeMessage()],
    currentRoom: null,
    invitations: [],
    roomParticipants: [],
    currentRoomSyncLag: 0,
    currentTemplates: [],
  };
}

function getScenarioState(scenario: MainPageMockScenario, instanceId: string) {
  const currentState = mockStates.get(instanceId);

  if (!currentState || currentState.scenario !== scenario) {
    const initialState = createInitialMockState(scenario);

    mockStates.set(instanceId, initialState);
    return initialState;
  }

  return currentState;
}

function normalizeMessage(value: string) {
  return value.trim().toLowerCase();
}

function buildResponse({
  aiChatRequestId,
  requestType,
  requestStatus,
  userMessage,
  assistantMessage,
  commandResult,
}: SendAiChatMessageResponse) {
  return {
    aiChatRequestId,
    requestType,
    requestStatus,
    userMessage,
    assistantMessage,
    commandResult,
  };
}

function appendMessages(state: MockMainPageState, ...messages: AiChatMessage[]) {
  state.messages = [...state.messages, ...messages];

  const lastMessage = messages[messages.length - 1];

  state.session = {
    ...state.session,
    updatedAt: lastMessage.createdAt,
  };
}

function createRequestIds(step: number) {
  return {
    aiChatRequestId: `mock-request-${step}`,
    userMessageId: `mock-user-message-${step}`,
    assistantMessageId: `mock-assistant-message-${step}`,
    timestamp: createIsoTimestamp(step + 1),
  };
}

function detectDifficulty(message: string) {
  if (message.includes("easy") || message.includes("쉬운") || message.includes("쉬움")) {
    return "EASY";
  }

  if (message.includes("hard") || message.includes("어려운") || message.includes("어려움")) {
    return "HARD";
  }

  if (message.includes("normal") || message.includes("보통")) {
    return "NORMAL";
  }

  return null;
}

function getTemplatesByDifficulty(difficulty: "EASY" | "NORMAL" | "HARD") {
  switch (difficulty) {
    case "EASY":
      return [
        {
          templateId: "mock-template-easy-1",
          title: "기초 산술 연산",
          description: "덧셈, 뺄셈, 곱셈, 나눗셈 중심의 입문용 문제예요.",
          difficulty,
        },
        {
          templateId: "mock-template-easy-2",
          title: "문자열 뒤집기",
          description: "기초 반복문과 문자열 처리를 익히는 미션이에요.",
          difficulty,
        },
      ];
    case "NORMAL":
      return [
        {
          templateId: "mock-template-normal-1",
          title: "배열 필터링",
          description: "조건 분기와 배열 순회를 함께 다루는 미션이에요.",
          difficulty,
        },
      ];
    case "HARD":
      return [
        {
          templateId: "mock-template-hard-1",
          title: "그래프 탐색",
          description: "조금 더 긴 구현 흐름을 요구하는 도전 미션이에요.",
          difficulty,
        },
      ];
    default:
      return [];
  }
}

function createFallbackResponse(state: MockMainPageState, message: string) {
  const stepNumber = state.messages.length + 1;
  const ids = createRequestIds(stepNumber);
  const userMessage = createMessage({
    messageId: ids.userMessageId,
    aiChatRequestId: ids.aiChatRequestId,
    senderType: "USER",
    messageType: "TEXT",
    content: message,
    createdAt: ids.timestamp,
  });
  const assistantMessage = createMessage({
    messageId: ids.assistantMessageId,
    aiChatRequestId: ids.aiChatRequestId,
    senderType: "ASSISTANT",
    messageType: "TEXT",
    content: "목데이터 모드에서는 '방 만들어줘'로 시작한 뒤 난이도와 템플릿을 선택해보세요.",
    createdAt: createIsoTimestamp(stepNumber + 1),
  });

  appendMessages(state, userMessage, assistantMessage);

  return buildResponse({
    aiChatRequestId: ids.aiChatRequestId,
    requestType: "ROOM_CREATE",
    requestStatus: "FAILED",
    userMessage,
    assistantMessage,
    commandResult: {
      commandType: "ROOM_CREATE",
      status: "FAILED",
      apiPath: "/v1/game-rooms",
      gameRoomId: null,
      title: null,
      participants: null,
      started: null,
    },
  });
}

function createRoomCreateStartResponse(state: MockMainPageState, message: string) {
  const ids = createRequestIds(state.messages.length + 1);
  const userMessage = createMessage({
    messageId: ids.userMessageId,
    aiChatRequestId: ids.aiChatRequestId,
    senderType: "USER",
    messageType: "TEXT",
    content: message,
    createdAt: ids.timestamp,
  });
  const assistantMessage = createMessage({
    messageId: ids.assistantMessageId,
    aiChatRequestId: ids.aiChatRequestId,
    senderType: "ASSISTANT",
    messageType: "COMMAND_RESULT",
    content: "좋아요! 먼저 만들고 싶은 방의 난이도를 골라주세요.",
    createdAt: createIsoTimestamp(state.messages.length + 2),
  });

  state.step = "waiting-difficulty";
  state.currentTemplates = [];
  appendMessages(state, userMessage, assistantMessage);

  return buildResponse({
    aiChatRequestId: ids.aiChatRequestId,
    requestType: "ROOM_CREATE",
    requestStatus: "COMPLETED",
    userMessage,
    assistantMessage,
    commandResult: {
      commandType: "ROOM_CREATE",
      status: "PENDING",
      apiPath: "/v1/game-rooms",
      gameRoomId: null,
      title: null,
      participants: null,
      started: null,
    },
  });
}

function createDifficultyResponse(
  state: MockMainPageState,
  message: string,
  difficulty: "EASY" | "NORMAL" | "HARD",
) {
  const ids = createRequestIds(state.messages.length + 1);
  const userMessage = createMessage({
    messageId: ids.userMessageId,
    aiChatRequestId: ids.aiChatRequestId,
    senderType: "USER",
    messageType: "TEXT",
    content: message,
    createdAt: ids.timestamp,
  });
  const assistantMessage = createMessage({
    messageId: ids.assistantMessageId,
    aiChatRequestId: ids.aiChatRequestId,
    senderType: "ASSISTANT",
    messageType: "COMMAND_RESULT",
    content: `${difficulty === "EASY" ? "쉬운" : difficulty === "NORMAL" ? "보통" : "어려운"} 난이도에서 선택할 수 있는 템플릿이에요.`,
    metadata: {
      difficulty,
      templates: getTemplatesByDifficulty(difficulty),
    },
    createdAt: createIsoTimestamp(state.messages.length + 2),
  });

  state.step = "waiting-template";
  state.currentTemplates = getTemplatesByDifficulty(difficulty);
  appendMessages(state, userMessage, assistantMessage);

  return buildResponse({
    aiChatRequestId: ids.aiChatRequestId,
    requestType: "ROOM_CREATE",
    requestStatus: "COMPLETED",
    userMessage,
    assistantMessage,
    commandResult: {
      commandType: "ROOM_CREATE",
      status: "PENDING",
      apiPath: "/v1/game-rooms",
      gameRoomId: null,
      title: null,
      participants: null,
      started: null,
    },
  });
}

function createTemplateResponse(state: MockMainPageState, message: string) {
  const ids = createRequestIds(state.messages.length + 1);
  const room = createCurrentRoom();
  const userMessage = createMessage({
    messageId: ids.userMessageId,
    aiChatRequestId: ids.aiChatRequestId,
    senderType: "USER",
    messageType: "TEXT",
    content: message,
    createdAt: ids.timestamp,
  });
  const assistantMessage = createMessage({
    messageId: ids.assistantMessageId,
    aiChatRequestId: ids.aiChatRequestId,
    senderType: "ASSISTANT",
    messageType: "COMMAND_RESULT",
    content: "방 생성을 완료했어요. `/main`에서 바로 대기방 모드로 이어질게요.",
    metadata: {
      gameRoomId: room.gameRoomId,
      roomStatus: room.status,
    },
    createdAt: createIsoTimestamp(state.messages.length + 2),
  });

  state.step = "room-created";
  state.currentRoom = room;
  state.roomParticipants = [
    createRoomParticipant({
      participantId: "mock-room-owner-participant-1",
      gameRoomId: room.gameRoomId,
      gameRoomTitle: room.title,
      userId: MAIN_PAGE_MOCK_USER.userId,
      nickname: MAIN_PAGE_MOCK_USER.nickname,
      role: "OWNER",
      status: "JOINED",
    }),
  ];
  state.currentTemplates = [];
  state.session = {
    ...state.session,
    gameRoomId: room.gameRoomId,
  };
  state.currentRoomSyncLag = state.scenario === "room-create-delay" ? 1 : 0;
  appendMessages(state, userMessage, assistantMessage);

  return buildResponse({
    aiChatRequestId: ids.aiChatRequestId,
    requestType: "ROOM_CREATE",
    requestStatus: "COMPLETED",
    userMessage,
    assistantMessage,
    commandResult: {
      commandType: "ROOM_CREATE",
      status: "SUCCESS",
      apiPath: "/v1/game-rooms",
      gameRoomId: room.gameRoomId,
      title: room.title,
      participants: null,
      started: false,
    },
  });
}

function createInvalidTemplateResponse(state: MockMainPageState, message: string) {
  const ids = createRequestIds(state.messages.length + 1);
  const userMessage = createMessage({
    messageId: ids.userMessageId,
    aiChatRequestId: ids.aiChatRequestId,
    senderType: "USER",
    messageType: "TEXT",
    content: message,
    createdAt: ids.timestamp,
  });
  const assistantMessage = createMessage({
    messageId: ids.assistantMessageId,
    aiChatRequestId: ids.aiChatRequestId,
    senderType: "ASSISTANT",
    messageType: "COMMAND_RESULT",
    content: "제시된 템플릿 중 하나를 선택하거나 템플릿 이름으로 다시 확인해주세요.",
    metadata: {
      templates: state.currentTemplates,
    },
    createdAt: createIsoTimestamp(state.messages.length + 2),
  });

  appendMessages(state, userMessage, assistantMessage);

  return buildResponse({
    aiChatRequestId: ids.aiChatRequestId,
    requestType: "ROOM_CREATE",
    requestStatus: "COMPLETED",
    userMessage,
    assistantMessage,
    commandResult: {
      commandType: "ROOM_CREATE",
      status: "PENDING",
      apiPath: "/v1/game-rooms",
      gameRoomId: null,
      title: null,
      participants: null,
      started: null,
    },
  });
}

function createRoomJoinResponse(state: MockMainPageState, message: string) {
  const ids = createRequestIds(state.messages.length + 1);
  const room = createJoinedInvitationRoom();
  const invitation = state.invitations[0] ?? createInvitationParticipant();
  const userMessage = createMessage({
    messageId: ids.userMessageId,
    aiChatRequestId: ids.aiChatRequestId,
    senderType: "USER",
    messageType: "TEXT",
    content: message,
    createdAt: ids.timestamp,
  });
  const assistantMessage = createMessage({
    messageId: ids.assistantMessageId,
    aiChatRequestId: ids.aiChatRequestId,
    senderType: "ASSISTANT",
    messageType: "COMMAND_RESULT",
    content: "초대를 수락했고 방 참가를 완료했어요.",
    metadata: {
      joinSource: "INVITATION_ACCEPT",
      membershipStatus: "JOINED",
      gameRoomId: room.gameRoomId,
    },
    createdAt: createIsoTimestamp(state.messages.length + 2),
  });

  state.currentRoom = room;
  state.invitations = [];
  state.roomParticipants = [
    createRoomParticipant({
      participantId: "mock-room-owner-participant-2",
      gameRoomId: room.gameRoomId,
      gameRoomTitle: room.title,
      userId: "mock-owner-1",
      nickname: "목방장",
      role: "OWNER",
      status: "JOINED",
    }),
    createRoomParticipant({
      participantId: "mock-room-player-participant-2",
      gameRoomId: room.gameRoomId,
      gameRoomTitle: room.title,
      userId: MAIN_PAGE_MOCK_USER.userId,
      nickname: MAIN_PAGE_MOCK_USER.nickname,
      role: "PARTICIPANT",
      status: "JOINED",
    }),
  ];
  state.session = {
    ...state.session,
    gameRoomId: room.gameRoomId,
  };
  state.currentRoomSyncLag = state.scenario === "invitation-delay" ? 1 : 0;
  appendMessages(state, userMessage, assistantMessage);

  return buildResponse({
    aiChatRequestId: ids.aiChatRequestId,
    requestType: "ROOM_JOIN",
    requestStatus: "COMPLETED",
    userMessage,
    assistantMessage,
    commandResult: {
      commandType: "ROOM_JOIN",
      status: "SUCCESS",
      apiPath: `/v1/game-room-participants/${invitation.participantId}/join`,
      gameRoomId: room.gameRoomId,
      title: room.title,
      participants: ["목방장", MAIN_PAGE_MOCK_USER.nickname],
      started: false,
    },
  });
}

function createInvitationDenyResponse(state: MockMainPageState, message: string) {
  const ids = createRequestIds(state.messages.length + 1);
  const invitation = state.invitations[0] ?? createInvitationParticipant();
  const userMessage = createMessage({
    messageId: ids.userMessageId,
    aiChatRequestId: ids.aiChatRequestId,
    senderType: "USER",
    messageType: "TEXT",
    content: message,
    createdAt: ids.timestamp,
  });
  const assistantMessage = createMessage({
    messageId: ids.assistantMessageId,
    aiChatRequestId: ids.aiChatRequestId,
    senderType: "ASSISTANT",
    messageType: "COMMAND_RESULT",
    content: "초대를 거절했고 초대장도 목록에서 정리했어요.",
    metadata: {
      membershipStatus: "DENIED",
      gameRoomId: invitation.gameRoomId,
    },
    createdAt: createIsoTimestamp(state.messages.length + 2),
  });

  state.invitations = [];
  state.roomParticipants = [];
  appendMessages(state, userMessage, assistantMessage);

  return buildResponse({
    aiChatRequestId: ids.aiChatRequestId,
    requestType: "USER_INVITE_DENY",
    requestStatus: "COMPLETED",
    userMessage,
    assistantMessage,
    commandResult: {
      commandType: "USER_INVITE_DENY",
      status: "SUCCESS",
      apiPath: `/v1/game-room-participants/${invitation.participantId}/deny`,
      gameRoomId: invitation.gameRoomId,
      title: invitation.gameRoomTitle,
      participants: null,
      started: false,
    },
  });
}

export function getMainPageMockScenario(search: string) {
  const params = new URLSearchParams(search);
  const value = params.get(MAIN_PAGE_MOCK_PARAM);

  return isMainPageMockScenario(value) ? value : null;
}

export function isMainPageMockModeEnabled(search: string) {
  return getMainPageMockScenario(search) !== null;
}

export function createMainPageMockApi(
  scenario: MainPageMockScenario,
  instanceId = `mock-instance-${++mockInstanceCounter}`,
) {
  return {
    async getCurrentRooms() {
      const state = getScenarioState(scenario, instanceId);

      if (state.currentRoomSyncLag > 0) {
        state.currentRoomSyncLag -= 1;
        return [];
      }

      return state.currentRoom ? [state.currentRoom] : [];
    },

    async getInvitedParticipants(_: string) {
      return getScenarioState(scenario, instanceId).invitations;
    },

    async getRoomParticipants(_: string) {
      return getScenarioState(scenario, instanceId).roomParticipants;
    },

    async getSessions(_: string) {
      return [getScenarioState(scenario, instanceId).session];
    },

    async getMessages(_: string) {
      return getScenarioState(scenario, instanceId).messages;
    },

    async sendMessage(_: string, request: { message: string }): Promise<SendAiChatMessageResponse> {
      const state = getScenarioState(scenario, instanceId);
      const normalizedMessage = normalizeMessage(request.message);

      if (
        (scenario === "invitation" || scenario === "invitation-delay") &&
        state.invitations.length > 0
      ) {
        if (normalizedMessage.includes("수락") || normalizedMessage.includes("참가")) {
          return createRoomJoinResponse(state, request.message.trim());
        }

        if (normalizedMessage.includes("거절") || normalizedMessage.includes("사양")) {
          return createInvitationDenyResponse(state, request.message.trim());
        }
      }

      if (
        state.step === "idle" &&
        (normalizedMessage.includes("방 만들어줘") || normalizedMessage.includes("방 생성"))
      ) {
        return createRoomCreateStartResponse(state, request.message.trim());
      }

      if (state.step === "waiting-difficulty") {
        const difficulty = detectDifficulty(normalizedMessage);

        if (difficulty) {
          return createDifficultyResponse(state, request.message.trim(), difficulty);
        }
      }

      if (state.step === "waiting-template") {
        const matchedTemplate = state.currentTemplates.find((template) =>
          normalizedMessage.includes(template.title.toLowerCase()),
        );

        if (matchedTemplate) {
          return createTemplateResponse(state, request.message.trim());
        }

        return createInvalidTemplateResponse(state, request.message.trim());
      }

      return createFallbackResponse(state, request.message.trim());
    },

    reset() {
      mockStates.set(instanceId, createInitialMockState(scenario));
    },
  };
}
