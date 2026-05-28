import test from "node:test";
import assert from "node:assert/strict";
import {
  createRoomSocketLifecycleController,
  getRoomSocketEligibility,
  isRoomSessionUnavailable,
  isSameRoomScopedPath,
} from "../../src/features/realtime/roomSocketLifecycle.ts";

function createRoom(overrides = {}) {
  return {
    gameRoomId: "room-1",
    title: "릴레이 방",
    status: "WAITING",
    ownerUserId: "owner-1",
    myRole: "PARTICIPANT",
    myMembershipStatus: "JOINED",
    joinedParticipantCount: 2,
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
    terminatedReason: null,
  });
});

test("room socket lifecycle reuses the same room connection and closes without reconnecting", () => {
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
  controller.sync(createInput());

  assert.equal(factoryCalls, 1);
  assert.equal(fake.socket.connectCalls, 1);

  fake.socket.trigger("disconnect", "transport close");

  assert.equal(factoryCalls, 1);
  assert.deepEqual(updates.at(-1), {
    activeRoomId: "room-1",
    connectionStatus: "closed",
    socketId: null,
    terminatedReason: "transport close",
  });

  controller.sync(createInput());

  assert.equal(factoryCalls, 1);
  assert.equal(fake.socket.connectCalls, 1);
  assert.deepEqual(updates.at(-1), {
    activeRoomId: "room-1",
    connectionStatus: "closed",
    socketId: null,
    terminatedReason: "transport close",
  });
});

test("isSameRoomScopedPath preserves sockets across same-room route transitions only", () => {
  assert.equal(isSameRoomScopedPath("/rooms/room-1/play", "room-1"), true);
  assert.equal(isSameRoomScopedPath("/rooms/room-1/result", "room-1"), true);
  assert.equal(isSameRoomScopedPath("/rooms/room-2/play", "room-1"), false);
  assert.equal(isSameRoomScopedPath("/main", "room-1"), false);
  assert.equal(isSameRoomScopedPath("/rooms/room-1/play", undefined), false);
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

test("isRoomSessionUnavailable locks room interactions on closed or error states", () => {
  assert.equal(isRoomSessionUnavailable("closed"), true);
  assert.equal(isRoomSessionUnavailable("error"), true);
  assert.equal(isRoomSessionUnavailable("connecting"), false);
  assert.equal(isRoomSessionUnavailable("connected"), false);
});
