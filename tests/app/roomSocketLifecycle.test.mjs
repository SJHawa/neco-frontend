import test from "node:test";
import assert from "node:assert/strict";
import { createAppStore } from "../../src/app/store/clientState.ts";
import {
  createRoomSocketLifecycleController,
  createStoreBackedRoomSocketLifecycleController,
  formatRealtimeCloseMessage,
  getRealtimeCloseBannerCopy,
  getRoomSocketEligibility,
  isRoomSessionUnavailable,
  isSameRoomScopedPath,
  parseSocketDisconnectClose,
  shouldRetainRoomSocketForPath,
} from "../../src/features/realtime/roomSocketLifecycle.ts";

function createRoom(overrides = {}) {
  return {
    gameRoomId: "room-1",
    status: "WAITING",
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
    ...overrides,
  };
}

function createInput(overrides = {}) {
  return {
    accessToken: "access-token",
    currentRoom: createRoom(),
    routeGameRoomId: "room-1",
    socketUrl: "http://localhost:8080",
    userId: "user-1",
    ...overrides,
  };
}

function createFakeSocket(id = "socket-1") {
  const handlers = new Map();
  const emitted = [];

  return {
    emitted,
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
      emit(eventName, payload) {
        emitted.push({ eventName, payload });
      },
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

test("getRoomSocketEligibility only allows joined waiting or in-progress current rooms", () => {
  assert.equal(getRoomSocketEligibility(createInput()).canConnect, true);
  assert.equal(
    getRoomSocketEligibility(
      createInput({
        currentRoom: createRoom({ status: "IN_PROGRESS" }),
      }),
    ).canConnect,
    true,
  );

  assert.deepEqual(
    getRoomSocketEligibility(
      createInput({
        currentRoom: createRoom({ myMembershipStatus: "INVITED" }),
      }),
    ),
    {
      canConnect: false,
      reason: "not-joined",
    },
  );
  assert.deepEqual(
    getRoomSocketEligibility(
      createInput({
        currentRoom: createRoom({ status: "FINISHED" }),
      }),
    ),
    {
      canConnect: false,
      reason: "unsupported-room-status",
    },
  );
  assert.deepEqual(
    getRoomSocketEligibility(createInput({ routeGameRoomId: "other-room" })),
    {
      canConnect: false,
      reason: "room-mismatch",
    },
  );
});

test("room socket lifecycle connects once and emits join-room after connect", () => {
  const updates = [];
  const fake = createFakeSocket();
  const controller = createRoomSocketLifecycleController({
    createSocket() {
      return fake.socket;
    },
    onUpdate(update) {
      updates.push(update);
    },
  });

  controller.sync(createInput());

  assert.equal(fake.socket.connectCalls, 1);
  assert.equal(updates.at(-1).connectionStatus, "connecting");

  fake.socket.trigger("connect");

  assert.deepEqual(fake.emitted, [
    {
      eventName: "join-room",
      payload: {
        accessToken: "access-token",
        gameRoomId: "room-1",
        userId: "user-1",
      },
    },
  ]);
  assert.deepEqual(updates.at(-1), {
    activeRoomId: "room-1",
    connectionStatus: "connected",
    socketId: "socket-1",
    closeCode: null,
    closeReasonCode: null,
  });
});

test("room socket lifecycle reconnects after a transport-only disconnect", () => {
  const updates = [];
  const firstSocket = createFakeSocket("socket-1");
  const secondSocket = createFakeSocket("socket-2");
  const sockets = [firstSocket.socket, secondSocket.socket];
  let factoryCalls = 0;
  const controller = createRoomSocketLifecycleController({
    createSocket() {
      factoryCalls += 1;
      return sockets.shift();
    },
    onUpdate(update) {
      updates.push(update);
    },
  });

  controller.sync(createInput());
  controller.sync(createInput());

  assert.equal(factoryCalls, 1);
  assert.equal(firstSocket.socket.connectCalls, 1);

  firstSocket.socket.trigger("disconnect", "transport close");

  assert.equal(factoryCalls, 1);
  assert.deepEqual(updates.at(-1), {
    activeRoomId: "room-1",
    connectionStatus: "closed",
    socketId: null,
    closeCode: null,
    closeReasonCode: "transport close",
  });

  controller.sync(createInput());

  assert.equal(factoryCalls, 2);
  assert.equal(secondSocket.socket.connectCalls, 1);
  assert.equal(updates.at(-1).connectionStatus, "connecting");

  secondSocket.socket.trigger("connect");

  assert.deepEqual(secondSocket.emitted, [
    {
      eventName: "join-room",
      payload: {
        accessToken: "access-token",
        gameRoomId: "room-1",
        userId: "user-1",
      },
    },
  ]);
  assert.deepEqual(updates.at(-1), {
    activeRoomId: "room-1",
    connectionStatus: "connected",
    socketId: "socket-2",
    closeCode: null,
    closeReasonCode: null,
  });
});

test("isSameRoomScopedPath preserves sockets across same-room route transitions only", () => {
  assert.equal(isSameRoomScopedPath("/rooms/room-1/play", "room-1"), true);
  assert.equal(isSameRoomScopedPath("/rooms/room-1/result", "room-1"), true);
  assert.equal(isSameRoomScopedPath("/rooms/room-2/play", "room-1"), false);
  assert.equal(isSameRoomScopedPath("/main", "room-1"), false);
  assert.equal(isSameRoomScopedPath("/rooms/room-1/play", undefined), false);
});

test("shouldRetainRoomSocketForPath also preserves sockets when /main transitions into gameplay", () => {
  assert.equal(shouldRetainRoomSocketForPath("/main", "room-1"), true);
  assert.equal(shouldRetainRoomSocketForPath("/rooms/room-1/play", "room-1"), true);
  assert.equal(shouldRetainRoomSocketForPath("/login", "room-1"), false);
});

test("store-backed lifecycle binds realtime reducers on connect", () => {
  const store = createAppStore();
  store.setState((state) => ({
    ...state,
    room: {
      ...state.room,
      currentRoom: createRoom(),
    },
    realtime: {
      ...state.realtime,
      activeRoomId: "room-1",
    },
  }));

  const fake = createFakeSocket();
  const controller = createStoreBackedRoomSocketLifecycleController(store, () => fake.socket);
  controller.sync(createInput());
  fake.socket.trigger("connect");

  fake.socket.trigger("game-started", {
    gameRoomId: "room-1",
    gameState: { status: "IN_PROGRESS" },
    missionState: {
      missionId: "mission-1",
      projectStructure: {
        rootPath: "/workspace",
        entryFilePath: "main.py",
        files: [{ filePath: "main.py", language: "python", readonly: false }],
      },
    },
    uiHints: { enterGameScreen: false, showMissionGuideModal: false },
    occurredAt: "2026-05-25T10:10:00Z",
  });

  assert.equal(store.getState().game.gameState.status, "IN_PROGRESS");
});

test("room socket lifecycle cleanup only leaves the expected active room", () => {
  const fakeRoom1 = createFakeSocket("socket-1");
  const fakeRoom2 = createFakeSocket("socket-2");
  const sockets = [fakeRoom1.socket, fakeRoom2.socket];
  const controller = createRoomSocketLifecycleController({
    createSocket() {
      return sockets.shift();
    },
    onUpdate() {},
  });

  controller.sync(createInput());
  controller.sync(
    createInput({
      currentRoom: createRoom({
        gameRoomId: "room-2",
      }),
      routeGameRoomId: "room-2",
    }),
  );
  controller.leave("room-1");

  assert.equal(fakeRoom1.socket.disconnectCalls, 1);
  assert.equal(fakeRoom2.socket.disconnectCalls, 0);
});

test("room socket lifecycle ignores cleanup without an expected room id", () => {
  const fake = createFakeSocket("socket-1");
  const controller = createRoomSocketLifecycleController({
    createSocket() {
      return fake.socket;
    },
    onUpdate() {},
  });

  controller.sync(createInput());
  controller.leave(undefined);

  assert.equal(fake.socket.disconnectCalls, 0);
});

test("room socket lifecycle does not wedge after a connect error", () => {
  const fakeFirst = createFakeSocket("socket-1");
  const fakeSecond = createFakeSocket("socket-2");
  const sockets = [fakeFirst.socket, fakeSecond.socket];
  const updates = [];
  const controller = createRoomSocketLifecycleController({
    createSocket() {
      return sockets.shift();
    },
    onUpdate(update) {
      updates.push(update);
    },
  });

  controller.sync(createInput());
  fakeFirst.socket.trigger("connect_error", "temporary failure");
  controller.sync(createInput());

  assert.equal(fakeFirst.socket.connectCalls, 1);
  assert.equal(fakeSecond.socket.connectCalls, 1);
  assert.equal(updates.at(-2).connectionStatus, "error");
  assert.equal(updates.at(-1).connectionStatus, "connecting");
});

test("parseSocketDisconnectClose preserves application close codes and transport reasons", () => {
  assert.deepEqual(parseSocketDisconnectClose("4401: AUTH_TOKEN_INVALID"), {
    closeCode: 4401,
    closeReasonCode: "AUTH_TOKEN_INVALID",
  });
  assert.deepEqual(parseSocketDisconnectClose("4401"), {
    closeCode: 4401,
    closeReasonCode: null,
  });
  assert.deepEqual(parseSocketDisconnectClose(1000), {
    closeCode: 1000,
    closeReasonCode: null,
  });
  assert.deepEqual(parseSocketDisconnectClose("transport close"), {
    closeCode: null,
    closeReasonCode: "transport close",
  });
});

test("room socket lifecycle keeps reflected application close codes terminated without reconnecting", () => {
  for (const reason of [
    "4401: AUTH_TOKEN_INVALID",
    "4403: FORBIDDEN_RESOURCE_ACCESS",
    "4404: GAME_ROOM_NOT_FOUND",
    "4401",
    1000,
    "1000",
  ]) {
    const updates = [];
    const fake = createFakeSocket();
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

    controller.sync(createInput());
    fake.socket.trigger("connect");
    fake.socket.trigger("disconnect", reason);

    const expectedClose = parseSocketDisconnectClose(reason);
    assert.deepEqual(
      updates.at(-1),
      {
        activeRoomId: "room-1",
        connectionStatus: "closed",
        socketId: null,
        closeCode: expectedClose.closeCode,
        closeReasonCode: expectedClose.closeReasonCode,
      },
      `disconnect reason ${String(reason)}`,
    );

    controller.sync(createInput());

    assert.equal(factoryCalls, 1, `reason ${String(reason)} must not create a new socket`);
    assert.equal(
      fake.socket.connectCalls,
      1,
      `reason ${String(reason)} must not reconnect`,
    );
    assert.equal(updates.at(-1).connectionStatus, "closed");
  }
});

test("formatRealtimeCloseMessage maps reflected reason codes to user-facing copy", () => {
  assert.equal(
    formatRealtimeCloseMessage({
      closeCode: 4403,
      closeReasonCode: "FORBIDDEN_RESOURCE_ACCESS",
    }),
    "You do not have permission to access this resource.",
  );
  assert.equal(
    getRealtimeCloseBannerCopy({
      closeCode: 1000,
      closeReasonCode: null,
      connectionStatus: "closed",
    }).description,
    "1000",
  );
});

test("isRoomSessionUnavailable locks room interactions on closed or error states", () => {
  assert.equal(isRoomSessionUnavailable("closed"), true);
  assert.equal(isRoomSessionUnavailable("error"), true);
  assert.equal(isRoomSessionUnavailable("connecting"), false);
  assert.equal(isRoomSessionUnavailable("connected"), false);
});
