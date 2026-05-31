import test from "node:test";
import assert from "node:assert/strict";
import { createRoomWaitingApi } from "../../src/features/room-waiting/roomWaitingApi.ts";
import {
  buildParticipantChangeSummary,
  buildRoomWaitingState,
  getMembershipStatusLabel,
  getParticipantRoleLabel,
  getWaitingRoomStartButtonState,
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
