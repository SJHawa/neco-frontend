import test from "node:test";
import assert from "node:assert/strict";
import {
  createMainPageMockApi,
  getMainPageMockScenario,
  isMainPageMockModeEnabled,
  MAIN_PAGE_MOCK_USER,
} from "../../src/pages/MainPage/mockMode.ts";

test("getMainPageMockScenario reads supported mock scenarios from the query string", () => {
  assert.equal(getMainPageMockScenario("?mock=room-create"), "room-create");
  assert.equal(getMainPageMockScenario("?mock=room-create-delay"), "room-create-delay");
  assert.equal(getMainPageMockScenario("?mock=invitation"), "invitation");
  assert.equal(getMainPageMockScenario("?mock=invitation-delay"), "invitation-delay");
  assert.equal(getMainPageMockScenario("?mock=start-ready"), "start-ready");
  assert.equal(getMainPageMockScenario("?mock=unknown"), null);
  assert.equal(isMainPageMockModeEnabled("?mock=room-create"), true);
  assert.equal(isMainPageMockModeEnabled("?mock=invitation"), true);
  assert.equal(isMainPageMockModeEnabled("?mock=start-ready"), true);
  assert.equal(isMainPageMockModeEnabled("?debug=scroll"), false);
});

test("createMainPageMockApi drives the staged room-create flow without a backend", async () => {
  const api = createMainPageMockApi("room-create");

  const initialSessions = await api.getSessions(MAIN_PAGE_MOCK_USER.userId);
  const initialMessages = await api.getMessages(initialSessions[0].aiChatSessionId);

  assert.equal(initialSessions.length, 1);
  assert.equal(initialMessages.length, 1);

  const startResponse = await api.sendMessage(initialSessions[0].aiChatSessionId, {
    message: "방 만들어줘",
  });

  assert.equal(startResponse.commandResult?.status, "PENDING");
  assert.equal(startResponse.assistantMessage?.content.includes("난이도"), true);
  assert.deepEqual(await api.getCurrentRooms(MAIN_PAGE_MOCK_USER.userId), []);

  const difficultyResponse = await api.sendMessage(initialSessions[0].aiChatSessionId, {
    message: "쉬운 난이도로 방 만들어줘.",
  });

  assert.equal(difficultyResponse.commandResult?.status, "PENDING");
  assert.equal(
    Array.isArray(difficultyResponse.assistantMessage?.metadata?.templates),
    true,
  );

  const templateResponse = await api.sendMessage(initialSessions[0].aiChatSessionId, {
    message: "기초 산술 연산 템플릿으로 진행할게요.",
  });

  assert.equal(templateResponse.commandResult?.status, "SUCCESS");
  assert.equal(templateResponse.commandResult?.gameRoomId, "mock-room-1");

  const currentRooms = await api.getCurrentRooms(MAIN_PAGE_MOCK_USER.userId);
  const waitingParticipants = await api.getRoomParticipants("mock-room-1");

  assert.equal(currentRooms.length, 1);
  assert.equal(currentRooms[0].status, "WAITING");
  assert.deepEqual(waitingParticipants, [
    {
      participantId: "mock-room-owner-participant-1",
      gameRoomId: "mock-room-1",
      userId: MAIN_PAGE_MOCK_USER.userId,
      nickname: MAIN_PAGE_MOCK_USER.nickname,
      role: "OWNER",
      membershipStatus: "JOINED",
      roomStatus: "WAITING",
      createdAt: "2026-05-25T03:06:00.000Z",
    },
  ]);
});

test("room-create-delay scenario keeps the first room refetch empty so waiting-room transition can be checked", async () => {
  const api = createMainPageMockApi("room-create-delay");
  const [session] = await api.getSessions(MAIN_PAGE_MOCK_USER.userId);

  await api.sendMessage(session.aiChatSessionId, {
    message: "방 만들어줘",
  });
  await api.sendMessage(session.aiChatSessionId, {
    message: "보통 난이도로 방 만들어줘.",
  });
  await api.sendMessage(session.aiChatSessionId, {
    message: "배열 필터링 템플릿으로 진행할게요.",
  });

  const firstRooms = await api.getCurrentRooms(MAIN_PAGE_MOCK_USER.userId);
  const secondRooms = await api.getCurrentRooms(MAIN_PAGE_MOCK_USER.userId);

  assert.deepEqual(firstRooms, []);
  assert.equal(secondRooms.length, 1);
  assert.equal(secondRooms[0].gameRoomId, "mock-room-1");
});

test("mock room-create flow keeps the template step pending until a suggested template is confirmed", async () => {
  const api = createMainPageMockApi("room-create");
  const [session] = await api.getSessions(MAIN_PAGE_MOCK_USER.userId);

  await api.sendMessage(session.aiChatSessionId, {
    message: "방 만들어줘",
  });
  await api.sendMessage(session.aiChatSessionId, {
    message: "쉬운 난이도로 방 만들어줘.",
  });

  const invalidTemplateResponse = await api.sendMessage(session.aiChatSessionId, {
    message: "아무 템플릿이나 할게요.",
  });

  assert.equal(invalidTemplateResponse.commandResult?.status, "PENDING");
  assert.equal(
    Array.isArray(invalidTemplateResponse.assistantMessage?.metadata?.templates),
    true,
  );
  assert.deepEqual(await api.getCurrentRooms(MAIN_PAGE_MOCK_USER.userId), []);
});

test("mock scenario reset restores the initial empty room-create state", async () => {
  const api = createMainPageMockApi("room-create");
  const [session] = await api.getSessions(MAIN_PAGE_MOCK_USER.userId);

  await api.sendMessage(session.aiChatSessionId, {
    message: "방 만들어줘",
  });
  api.reset();

  const rooms = await api.getCurrentRooms(MAIN_PAGE_MOCK_USER.userId);
  const messages = await api.getMessages(session.aiChatSessionId);

  assert.deepEqual(rooms, []);
  assert.equal(messages.length, 1);
});

test("invitation mock scenario accepts an invitation and enters waiting-room state", async () => {
  const api = createMainPageMockApi("invitation");
  const [session] = await api.getSessions(MAIN_PAGE_MOCK_USER.userId);
  const initialInvitations = await api.getInvitedParticipants(MAIN_PAGE_MOCK_USER.userId);

  assert.equal(initialInvitations.length, 1);

  const response = await api.sendMessage(session.aiChatSessionId, {
    message: "게임방 초대를 수락할게요.",
  });

  assert.equal(response.requestType, "ROOM_JOIN");
  assert.equal(response.commandResult?.status, "SUCCESS");
  assert.deepEqual(await api.getInvitedParticipants(MAIN_PAGE_MOCK_USER.userId), []);

  const currentRooms = await api.getCurrentRooms(MAIN_PAGE_MOCK_USER.userId);

  assert.equal(currentRooms.length, 1);
  assert.equal(currentRooms[0].myMembershipStatus, "JOINED");
  assert.deepEqual(await api.getRoomParticipants("mock-invitation-room-1"), [
    {
      participantId: "mock-room-owner-participant-2",
      gameRoomId: "mock-invitation-room-1",
      userId: "mock-owner-1",
      nickname: "목방장",
      role: "OWNER",
      membershipStatus: "JOINED",
      roomStatus: "WAITING",
      createdAt: "2026-05-25T03:06:00.000Z",
    },
    {
      participantId: "mock-room-player-participant-2",
      gameRoomId: "mock-invitation-room-1",
      userId: MAIN_PAGE_MOCK_USER.userId,
      nickname: MAIN_PAGE_MOCK_USER.nickname,
      role: "PARTICIPANT",
      membershipStatus: "JOINED",
      roomStatus: "WAITING",
      createdAt: "2026-05-25T03:06:00.000Z",
    },
  ]);
});

test("invitation-delay scenario keeps the first joined room refetch empty so waiting-room transition can be checked", async () => {
  const api = createMainPageMockApi("invitation-delay");
  const [session] = await api.getSessions(MAIN_PAGE_MOCK_USER.userId);

  await api.sendMessage(session.aiChatSessionId, {
    message: "게임방 초대를 수락할게요.",
  });

  const firstRooms = await api.getCurrentRooms(MAIN_PAGE_MOCK_USER.userId);
  const secondRooms = await api.getCurrentRooms(MAIN_PAGE_MOCK_USER.userId);

  assert.deepEqual(firstRooms, []);
  assert.equal(secondRooms.length, 1);
  assert.equal(secondRooms[0].gameRoomId, "mock-invitation-room-1");
});

test("invitation mock scenario can deny an invitation and remove the card without entering a room", async () => {
  const api = createMainPageMockApi("invitation");
  const [session] = await api.getSessions(MAIN_PAGE_MOCK_USER.userId);

  const response = await api.sendMessage(session.aiChatSessionId, {
    message: "게임방 초대는 거절할게요.",
  });

  assert.equal(response.requestType, "USER_INVITE_DENY");
  assert.equal(response.commandResult?.status, "SUCCESS");
  assert.deepEqual(await api.getInvitedParticipants(MAIN_PAGE_MOCK_USER.userId), []);
  assert.deepEqual(await api.getRoomParticipants("mock-invitation-room-1"), []);
  assert.deepEqual(await api.getCurrentRooms(MAIN_PAGE_MOCK_USER.userId), []);
});

test("start-ready mock scenario accepts the start request but keeps the user in waiting-room state", async () => {
  const api = createMainPageMockApi("start-ready");
  const currentRooms = await api.getCurrentRooms(MAIN_PAGE_MOCK_USER.userId);

  assert.equal(currentRooms.length, 1);
  assert.equal(currentRooms[0].gameRoomId, "mock-start-ready-room-1");
  assert.equal(currentRooms[0].status, "WAITING");
  assert.equal(currentRooms[0].joinedParticipantCount, 2);

  const response = await api.startGame("mock-start-ready-room-1");

  assert.deepEqual(response, { success: true });
  assert.deepEqual(await api.getCurrentRooms(MAIN_PAGE_MOCK_USER.userId), currentRooms);
  assert.deepEqual(await api.getRoomParticipants("mock-start-ready-room-1"), [
    {
      participantId: "mock-start-owner-participant-1",
      gameRoomId: "mock-start-ready-room-1",
      userId: MAIN_PAGE_MOCK_USER.userId,
      nickname: MAIN_PAGE_MOCK_USER.nickname,
      role: "OWNER",
      membershipStatus: "JOINED",
      roomStatus: "WAITING",
      createdAt: "2026-05-25T03:06:00.000Z",
    },
    {
      participantId: "mock-start-player-participant-1",
      gameRoomId: "mock-start-ready-room-1",
      userId: "mock-teammate-1",
      nickname: "목팀원",
      role: "PARTICIPANT",
      membershipStatus: "JOINED",
      roomStatus: "WAITING",
      createdAt: "2026-05-25T03:06:00.000Z",
    },
  ]);
});
