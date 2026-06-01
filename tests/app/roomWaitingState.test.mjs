import test from "node:test";
import assert from "node:assert/strict";
import { shouldPreserveCurrentRoomOnEmptyHttpHydration } from "../../src/pages/MainPage/mainInitialization.ts";
import { createRoomWaitingApi } from "../../src/features/room-waiting/roomWaitingApi.ts";
import {
  buildParticipantChangeSummary,
  buildRoomWaitingState,
  getMembershipStatusLabel,
  getParticipantRoleLabel,
  getRealtimeWaitingRoomSnapshot,
  isSameRoomWaitingState,
  getWaitingRoomStartButtonState,
  resolveWaitingRoomCurrentRoom,
} from "../../src/features/room-waiting/roomWaitingState.ts";

function createRoom(overrides = {}) {
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

function createParticipant(overrides = {}) {
  return {
    participantId: "participant-1",
    gameRoomId: "room-1",
    userId: "user-1",
    nickname: "현하",
    role: "PARTICIPANT",
    membershipStatus: "JOINED",
    roomStatus: "WAITING",
    createdAt: "2026-05-25T10:06:00Z",
    ...overrides,
  };
}

test("createRoomWaitingApi requests participants by gameRoomId", async () => {
  const calls = [];
  const api = createRoomWaitingApi({
    async get(path, options) {
      calls.push({ path, options });
      return [createParticipant()];
    },
  });

  const result = await api.getParticipants("room 1");

  assert.equal(result.length, 1);
  assert.deepEqual(calls, [
    {
      path: "/game-room-participants?gameRoomId=room%201",
      options: undefined,
    },
  ]);
});

test("createRoomWaitingApi preserves reflected roomStatus values from participant rows", async () => {
  const api = createRoomWaitingApi({
    async get() {
      return [
        {
          participantId: "participant-1",
          gameRoomId: "room-1",
          userId: "owner-1",
          role: "OWNER",
          membershipStatus: "JOINED",
          roomStatus: "IN_PROGRESS",
          createdAt: "2026-05-25T10:06:00Z",
        },
      ];
    },
  });

  const [participant] = await api.getParticipants("room-1");

  assert.equal(participant.roomStatus, "IN_PROGRESS");
});

test("createRoomWaitingApi normalizes backend participant payloads that use id and membershipStatus", async () => {
  const api = createRoomWaitingApi({
    async get() {
      return [
        {
          id: "participant-1",
          gameRoomId: "room-1",
          userId: "owner-1",
          role: "OWNER",
          membershipStatus: "JOINED",
          createdAt: "2026-05-25T10:06:00Z",
        },
      ];
    },
  });

  const [participant] = await api.getParticipants("room-1");

  assert.deepEqual(participant, {
    participantId: "participant-1",
    gameRoomId: "room-1",
    userId: "owner-1",
    nickname: "방장",
    role: "OWNER",
    membershipStatus: "JOINED",
    roomStatus: "WAITING",
    createdAt: "2026-05-25T10:06:00Z",
  });
});

test("buildRoomWaitingState derives IN_PROGRESS gameState metadata from the current room", () => {
  const room = createRoom({
    status: "IN_PROGRESS",
    difficulty: "HARD",
    timeLimitSeconds: 45,
    maxStrikeCount: 5,
  });

  const result = buildRoomWaitingState({
    currentRoom: room,
    participants: [createParticipant()],
    currentUser: {
      userId: "owner-1",
      nickname: "방장",
    },
  });

  assert.deepEqual(result.gameState, {
    status: "IN_PROGRESS",
    difficulty: "HARD",
    timeLimitSeconds: 45,
    maxStrikeCount: 5,
    minParticipants: 2,
    maxParticipants: 4,
  });
});

test("buildRoomWaitingState maps participant query results into waiting-room state", () => {
  const room = createRoom({
    myRole: "PARTICIPANT",
    ownerUserId: "owner-1",
    joinedParticipantCount: 2,
  });
  const previousState = {
    currentRoom: room,
    participants: [
      {
        userId: "owner-1",
        nickname: "방장",
        role: "OWNER",
        membershipStatus: "JOINED",
      },
    ],
    changedParticipant: null,
    gameState: {
      status: "WAITING",
      difficulty: "NORMAL",
      timeLimitSeconds: 30,
      maxStrikeCount: 3,
      minParticipants: 2,
      maxParticipants: 4,
    },
    missionState: null,
  };

  const result = buildRoomWaitingState({
    currentRoom: room,
    participants: [
      createParticipant({
        userId: "owner-1",
        nickname: "방장",
        role: "OWNER",
      }),
      createParticipant(),
    ],
    previousState,
    currentUser: {
      userId: "user-1",
      nickname: "현하",
    },
  });

  assert.deepEqual(result.participants, [
    {
      userId: "owner-1",
      nickname: "방장",
      role: "OWNER",
      membershipStatus: "JOINED",
    },
    {
      userId: "user-1",
      nickname: "현하",
      role: "PARTICIPANT",
      membershipStatus: "JOINED",
    },
  ]);
  assert.deepEqual(result.changedParticipant, {
    userId: "user-1",
    nickname: "현하",
    role: "PARTICIPANT",
    membershipStatus: "JOINED",
  });
  assert.equal(result.currentRoom.joinedParticipantCount, 2);
});

test("buildRoomWaitingState rebuilds gameState when the same room transitions WAITING to IN_PROGRESS", () => {
  const previousState = {
    currentRoom: createRoom({ gameRoomId: "room-1", status: "WAITING" }),
    participants: [],
    changedParticipant: null,
    gameState: {
      status: "WAITING",
      difficulty: "NORMAL",
      timeLimitSeconds: 30,
      maxStrikeCount: 3,
      minParticipants: 2,
      maxParticipants: 4,
    },
    missionState: null,
  };

  const result = buildRoomWaitingState({
    currentRoom: createRoom({ gameRoomId: "room-1", status: "IN_PROGRESS" }),
    participants: [],
    previousState,
    currentUser: {
      userId: "owner-1",
      nickname: "방장",
    },
  });

  assert.equal(result.gameState.status, "IN_PROGRESS");
});

test("buildRoomWaitingState resets gameState and missionState when the current room changes", () => {
  const result = buildRoomWaitingState({
    currentRoom: createRoom({ gameRoomId: "room-new" }),
    participants: [],
    previousState: {
      currentRoom: createRoom({ gameRoomId: "room-old" }),
      participants: [],
      changedParticipant: null,
      gameState: {
        status: "IN_PROGRESS",
        strikeCount: 2,
        maxStrikeCount: 1,
      },
      missionState: {
        missionId: "mission-old",
      },
    },
    currentUser: {
      userId: "owner-1",
      nickname: "방장",
    },
  });

  assert.deepEqual(result.gameState, {
    status: "WAITING",
    difficulty: "NORMAL",
    timeLimitSeconds: 30,
    maxStrikeCount: 3,
    minParticipants: 2,
    maxParticipants: 4,
  });
  assert.equal(result.missionState, null);
});

test("buildRoomWaitingState keeps changedParticipant null on first waiting-room hydration", () => {
  const room = createRoom({
    joinedParticipantCount: 2,
  });

  const result = buildRoomWaitingState({
    currentRoom: room,
    participants: [
      createParticipant({
        userId: "owner-1",
        nickname: "방장",
        role: "OWNER",
      }),
      createParticipant(),
    ],
    currentUser: {
      userId: "user-1",
      nickname: "현하",
    },
  });

  assert.equal(result.changedParticipant, null);
});

test("buildRoomWaitingState falls back to the current user when the participant query is empty", () => {
  const room = createRoom();

  const result = buildRoomWaitingState({
    currentRoom: room,
    participants: [],
    currentUser: {
      userId: "owner-1",
      nickname: "방장",
    },
  });

  assert.deepEqual(result.participants, [
    {
      userId: "owner-1",
      nickname: "방장",
      role: "OWNER",
      membershipStatus: "JOINED",
    },
  ]);
});

test("getWaitingRoomStartButtonState follows the owner and minimum participant rules", () => {
  assert.deepEqual(getWaitingRoomStartButtonState(createRoom()), {
    canShowStartButton: true,
    canClickStartButton: false,
  });

  assert.deepEqual(
    getWaitingRoomStartButtonState(
      createRoom({
        joinedParticipantCount: 2,
      }),
    ),
    {
      canShowStartButton: true,
      canClickStartButton: true,
    },
  );

  assert.deepEqual(
    getWaitingRoomStartButtonState(
      createRoom({
        myRole: "PARTICIPANT",
        joinedParticipantCount: 3,
      }),
    ),
    {
      canShowStartButton: false,
      canClickStartButton: false,
    },
  );
});

test("getWaitingRoomStartButtonState hides the start CTA for IN_PROGRESS rooms", () => {
  assert.deepEqual(
    getWaitingRoomStartButtonState(
      createRoom({
        status: "IN_PROGRESS",
        joinedParticipantCount: 4,
      }),
    ),
    {
      canShowStartButton: false,
      canClickStartButton: false,
    },
  );
});

test("buildRoomWaitingState keeps realtime IN_PROGRESS snapshot when http room is still WAITING", () => {
  const httpRoom = createRoom({ status: "WAITING", joinedParticipantCount: 2 });
  const realtimeSnapshot = {
    gameState: {
      status: "IN_PROGRESS",
      strikeCount: 0,
      maxStrikeCount: 3,
      turnState: {
        turnId: "turn-1",
        turnNumber: 1,
        currentPlayerId: "owner-1",
        startedAt: "2026-05-25T10:10:00Z",
        deadlineAt: "2026-05-25T10:10:30Z",
        timeLimitSeconds: 30,
        remainingTimeSeconds: 30,
        status: "IN_PROGRESS",
      },
    },
    missionState: {
      missionId: "mission-1",
      title: "짝수 찾기",
    },
  };

  const result = buildRoomWaitingState({
    currentRoom: httpRoom,
    participants: [
      createParticipant({
        userId: "owner-1",
        nickname: "방장",
        role: "OWNER",
      }),
      createParticipant(),
    ],
    previousState: {
      currentRoom: { ...httpRoom, status: "IN_PROGRESS" },
      participants: [
        {
          userId: "owner-1",
          nickname: "방장",
          role: "OWNER",
          membershipStatus: "JOINED",
        },
        {
          userId: "user-1",
          nickname: "현하",
          role: "PARTICIPANT",
          membershipStatus: "JOINED",
        },
      ],
      changedParticipant: null,
      gameState: realtimeSnapshot.gameState,
      missionState: realtimeSnapshot.missionState,
    },
    currentUser: {
      userId: "owner-1",
      nickname: "방장",
    },
    realtimeSnapshot,
  });

  assert.equal(result.gameState.status, "IN_PROGRESS");
  assert.equal(result.currentRoom.status, "IN_PROGRESS");
  assert.equal(result.missionState?.missionId, "mission-1");
});

test("getRealtimeWaitingRoomSnapshot exposes active-room gameplay state for /main hydration", () => {
  const snapshot = getRealtimeWaitingRoomSnapshot(
    {
      game: {
        gameState: { status: "IN_PROGRESS" },
        missionState: { missionId: "mission-1" },
      },
      realtime: { activeRoomId: "room-1" },
    },
    "room-1",
  );

  assert.deepEqual(snapshot, {
    gameState: { status: "IN_PROGRESS" },
    missionState: { missionId: "mission-1" },
  });
});

test("shouldPreserveCurrentRoomOnEmptyHttpHydration stays true while active room id matches store room", () => {
  assert.equal(
    shouldPreserveCurrentRoomOnEmptyHttpHydration({
      room: { currentRoom: createRoom({ status: "IN_PROGRESS" }) },
      realtime: { activeRoomId: "room-1", participants: [] },
      game: {
        gameState: { status: "IN_PROGRESS" },
        missionState: null,
      },
    }),
    true,
  );
});

test("resolveWaitingRoomCurrentRoom prefers realtime-merged room metadata over stale http WAITING", () => {
  const httpRoom = createRoom({ status: "WAITING" });
  const realtimeSnapshot = {
    gameState: { status: "IN_PROGRESS" },
    missionState: null,
  };

  const resolved = resolveWaitingRoomCurrentRoom({
    httpRoom,
    storeCurrentRoom: { ...httpRoom, status: "IN_PROGRESS" },
    realtimeSnapshot,
    participants: [
      {
        userId: "owner-1",
        nickname: "방장",
        role: "OWNER",
        membershipStatus: "JOINED",
      },
    ],
  });

  assert.equal(resolved.status, "IN_PROGRESS");
});

test("buildParticipantChangeSummary describes membership changes for waiting-room cards", () => {
  assert.equal(
    buildParticipantChangeSummary({
      userId: "user-1",
      nickname: "현하",
      role: "PARTICIPANT",
      membershipStatus: "LEFT",
    }),
    "현하님이 대기방에서 나갔어요.",
  );
});

test("status and role labels stay user-facing", () => {
  assert.equal(getMembershipStatusLabel("DENIED"), "거절됨");
  assert.equal(getParticipantRoleLabel("OWNER"), "방장");
});

test("isSameRoomWaitingState returns true for semantically identical waiting-room state", () => {
  const left = buildRoomWaitingState({
    currentRoom: createRoom(),
    participants: [
      createParticipant({
        userId: "owner-1",
        nickname: "방장",
        role: "OWNER",
      }),
      createParticipant(),
    ],
    currentUser: {
      userId: "user-1",
      nickname: "현하",
    },
  });

  const right = buildRoomWaitingState({
    currentRoom: createRoom(),
    participants: [
      createParticipant({
        userId: "owner-1",
        nickname: "방장",
        role: "OWNER",
      }),
      createParticipant(),
    ],
    currentUser: {
      userId: "user-1",
      nickname: "현하",
    },
  });

  assert.equal(isSameRoomWaitingState(left, right), true);
});
