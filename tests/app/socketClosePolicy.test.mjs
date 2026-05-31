import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "zustand/vanilla";
import {
  resolveSocketClosePolicyAction,
  shouldLatchTerminatedSocketSession,
} from "../../src/features/realtime/socketClosePolicy.ts";
import {
  applySocketClosePolicy,
  clearRoomContextAfterTerminatedSession,
  shouldApplySocketClosePolicy,
} from "../../src/features/realtime/applySocketClosePolicy.ts";
import { createInitialState } from "../../src/app/store/clientState.ts";
import {
  createRoomSocketLifecycleController,
  isRoomSessionUnavailable,
} from "../../src/features/realtime/roomSocketLifecycle.ts";

test("resolveSocketClosePolicyAction maps reflected application close codes", () => {
  assert.equal(
    resolveSocketClosePolicyAction(4401, "AUTH_TOKEN_INVALID"),
    "auth-logout",
  );
  assert.equal(resolveSocketClosePolicyAction(4401, null), "auth-logout");
  assert.equal(
    resolveSocketClosePolicyAction(4403, "FORBIDDEN_RESOURCE_ACCESS"),
    "terminated-session",
  );
  assert.equal(
    resolveSocketClosePolicyAction(4404, "GAME_ROOM_NOT_FOUND"),
    "terminated-session",
  );
  assert.equal(resolveSocketClosePolicyAction(1000, null), "intentional-close");
  assert.equal(
    resolveSocketClosePolicyAction(null, "transport close"),
    null,
  );
});

test("shouldApplySocketClosePolicy only runs for closed application close codes", () => {
  assert.equal(
    shouldApplySocketClosePolicy({
      connectionStatus: "closed",
      closeCode: 4403,
      closeReasonCode: "FORBIDDEN_RESOURCE_ACCESS",
    }),
    true,
  );
  assert.equal(
    shouldApplySocketClosePolicy({
      connectionStatus: "closed",
      closeCode: 1000,
      closeReasonCode: null,
    }),
    false,
  );
  assert.equal(
    shouldApplySocketClosePolicy({
      connectionStatus: "closed",
      closeCode: null,
      closeReasonCode: "transport close",
    }),
    false,
  );
  assert.equal(
    shouldApplySocketClosePolicy({
      connectionStatus: "connecting",
      closeCode: 4401,
      closeReasonCode: null,
    }),
    false,
  );
});

test("shouldLatchTerminatedSocketSession blocks reconnect for numeric and reason-only closes", () => {
  assert.equal(shouldLatchTerminatedSocketSession(4401, null), true);
  assert.equal(shouldLatchTerminatedSocketSession(null, "transport close"), true);
  assert.equal(shouldLatchTerminatedSocketSession(null, null), false);
});

test("applySocketClosePolicy preserves closed room session for intentional close", () => {
  const store = createStore(() => ({
    ...createInitialState(),
    realtime: {
      ...createInitialState().realtime,
      connectionStatus: "closed",
      closeCode: 1000,
      closeReasonCode: null,
      activeRoomId: "room-1",
    },
  }));

  let leaveCalls = 0;

  applySocketClosePolicy({
    action: "intentional-close",
    activeRoomId: "room-1",
    navigate() {
      assert.fail("intentional close must not auto-navigate away from the room page");
    },
    routeTarget: null,
    store,
    socketController: {
      leave() {
        leaveCalls += 1;
      },
      sync() {},
    },
  });

  assert.equal(leaveCalls, 0);
  assert.equal(store.getState().realtime.connectionStatus, "closed");
  assert.equal(store.getState().realtime.closeCode, 1000);
  assert.equal(isRoomSessionUnavailable(store.getState().realtime.connectionStatus), true);
});

test("intentional close keeps the room page in a closed recovery state after disconnect", () => {
  const updates = [];
  const fake = createFakeSocketForPolicyTest();
  let factoryCalls = 0;
  const controller = createRoomSocketLifecycleController({
    createSocket() {
      factoryCalls += 1;
      return fake.socket;
    },
    onUpdate(update) {
      updates.push(update);
    },
  });

  controller.sync(createPolicyLifecycleInput());
  fake.socket.trigger("connect");
  fake.socket.trigger("disconnect", 1000);

  assert.equal(updates.at(-1).connectionStatus, "closed");
  assert.equal(updates.at(-1).closeCode, 1000);

  applySocketClosePolicy({
    action: "intentional-close",
    activeRoomId: "room-1",
    navigate() {
      assert.fail("intentional close must keep the recovery banner on the room page");
    },
    routeTarget: null,
    store: createStore(() => ({
      ...createInitialState(),
      realtime: {
        ...createInitialState().realtime,
        connectionStatus: updates.at(-1).connectionStatus,
        closeCode: updates.at(-1).closeCode,
        closeReasonCode: updates.at(-1).closeReasonCode,
        activeRoomId: updates.at(-1).activeRoomId,
      },
    })),
    socketController: controller,
  });

  assert.equal(fake.socket.disconnectCalls, 0);
  assert.equal(updates.at(-1).connectionStatus, "closed");
  assert.equal(updates.at(-1).closeCode, 1000);

  controller.sync(createPolicyLifecycleInput());

  assert.equal(factoryCalls, 1);
  assert.equal(fake.socket.connectCalls, 1);
  assert.equal(updates.at(-1).connectionStatus, "closed");
});

test("applySocketClosePolicy clears room-scoped slices for terminated sessions without auth logout", () => {
  const store = createStore(() => ({
    ...createInitialState(),
    room: {
      ...createInitialState().room,
      currentRoom: {
        gameRoomId: "room-1",
        status: "IN_PROGRESS",
        difficulty: "NORMAL",
        ownerUserId: "owner-1",
        myRole: "PARTICIPANT",
        myMembershipStatus: "JOINED",
        joinedParticipantCount: 2,
        timeLimitSeconds: 30,
        maxStrikeCount: 3,
        minParticipants: 2,
        maxParticipants: 4,
        createdAt: "2026-05-25T10:00:00Z",
        updatedAt: "2026-05-25T10:05:00Z",
      },
      roomWaitingState: {
        gameRoomId: "room-1",
        status: "IN_PROGRESS",
        participants: [],
      },
    },
    game: {
      gameState: {
        gameRoomId: "room-1",
        status: "IN_PROGRESS",
        currentTurn: 1,
        currentPlayerUserId: "user-1",
        remainingTimeSeconds: 30,
        deadlineAt: "2026-05-25T10:10:00Z",
      },
      missionState: {
        missionId: "mission-1",
        title: "Mission",
        projectStructure: { files: [] },
      },
      lastTurnEvaluation: null,
      missionResult: null,
    },
    editor: {
      files: { "main.py": "print('stale')" },
      activeFilePath: "main.py",
      markers: [{ line: 1, message: "stale" }],
    },
    realtime: {
      ...createInitialState().realtime,
      connectionStatus: "closed",
      closeCode: 4404,
      closeReasonCode: "GAME_ROOM_NOT_FOUND",
      activeRoomId: "room-1",
      participants: [
        {
          participantId: "participant-1",
          userId: "user-1",
          nickname: "Player",
          membershipStatus: "JOINED",
        },
      ],
    },
  }));

  const navigated = [];
  let leaveCalls = 0;

  applySocketClosePolicy({
    action: "terminated-session",
    activeRoomId: "room-1",
    navigate(path) {
      navigated.push(path);
    },
    routeTarget: "/main",
    store,
    socketController: {
      leave(roomId) {
        leaveCalls += 1;
        assert.equal(roomId, "room-1");
      },
      sync() {},
    },
  });

  assert.equal(leaveCalls, 1);
  assert.deepEqual(navigated, ["/main"]);
  assert.equal(store.getState().room.currentRoom, null);
  assert.equal(store.getState().room.roomWaitingState, null);
  assert.equal(store.getState().game.gameState, null);
  assert.equal(store.getState().game.missionState, null);
  assert.deepEqual(store.getState().editor.files, {});
  assert.equal(store.getState().editor.activeFilePath, null);
  assert.deepEqual(store.getState().editor.markers, []);
  assert.deepEqual(store.getState().realtime.participants, []);
  assert.equal(store.getState().realtime.activeRoomId, null);
  assert.equal(store.getState().realtime.closeCode, 4404);
  assert.equal(store.getState().realtime.connectionStatus, "closed");
});

test("clearRoomContextAfterTerminatedSession clears all room-scoped slices", () => {
  const store = createStore(() => ({
    ...createInitialState(),
    room: {
      ...createInitialState().room,
      currentRoom: {
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
      },
    },
    game: {
      gameState: {
        gameRoomId: "room-1",
        status: "WAITING",
        currentTurn: 0,
        currentPlayerUserId: null,
        remainingTimeSeconds: 30,
        deadlineAt: null,
      },
      missionState: null,
      lastTurnEvaluation: null,
      missionResult: null,
    },
    editor: {
      files: { "main.py": "stale" },
      activeFilePath: "main.py",
      markers: [],
    },
    realtime: {
      ...createInitialState().realtime,
      connectionStatus: "closed",
      closeCode: 4403,
      closeReasonCode: "FORBIDDEN_RESOURCE_ACCESS",
      participants: [
        {
          participantId: "participant-1",
          userId: "user-1",
          nickname: "Player",
          membershipStatus: "JOINED",
        },
      ],
    },
  }));

  clearRoomContextAfterTerminatedSession(store);

  assert.equal(store.getState().room.currentRoom, null);
  assert.equal(store.getState().game.gameState, null);
  assert.deepEqual(store.getState().editor.files, {});
  assert.deepEqual(store.getState().realtime.participants, []);
  assert.equal(store.getState().realtime.closeCode, 4403);
  assert.equal(store.getState().realtime.connectionStatus, "closed");
});

function createFakeSocketForPolicyTest(id = "socket-1") {
  const handlers = new Map();

  return {
    socket: {
      id,
      connectCalls: 0,
      disconnectCalls: 0,
      connect() {
        this.connectCalls += 1;
      },
      disconnect() {
        this.disconnectCalls += 1;
      },
      emit() {},
      on(eventName, handler) {
        handlers.set(eventName, handler);
      },
      off(eventName) {
        handlers.delete(eventName);
      },
      trigger(eventName, payload) {
        handlers.get(eventName)?.(payload);
      },
    },
  };
}

function createPolicyLifecycleInput() {
  return {
    accessToken: "access-token",
    currentRoom: {
      gameRoomId: "room-1",
      status: "IN_PROGRESS",
      difficulty: "NORMAL",
      ownerUserId: "owner-1",
      myRole: "PARTICIPANT",
      myMembershipStatus: "JOINED",
      joinedParticipantCount: 2,
      timeLimitSeconds: 30,
      maxStrikeCount: 3,
      minParticipants: 2,
      maxParticipants: 4,
      createdAt: "2026-05-25T10:00:00Z",
      updatedAt: "2026-05-25T10:05:00Z",
    },
    routeGameRoomId: "room-1",
    socketUrl: "http://localhost:8080",
    userId: "user-1",
  };
}
