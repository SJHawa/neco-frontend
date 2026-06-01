import test from "node:test";
import assert from "node:assert/strict";
import { createRawWebSocketRealtimeSocket } from "../../src/shared/socket/socketClient.ts";

class FakeWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.sent = [];
    this.closeCalls = [];
    this.listeners = new Map();
  }

  addEventListener(eventName, handler) {
    const handlers = this.listeners.get(eventName) ?? new Set();
    handlers.add(handler);
    this.listeners.set(eventName, handlers);
  }

  removeEventListener(eventName, handler) {
    const handlers = this.listeners.get(eventName);
    if (!handlers) {
      return;
    }

    handlers.delete(handler);
    if (handlers.size === 0) {
      this.listeners.delete(eventName);
    }
  }

  send(data) {
    this.sent.push(data);
  }

  close(code = 1000, reason = "") {
    this.closeCalls.push({ code, reason });
    this.readyState = 3;
  }

  trigger(eventName, event = {}) {
    const handlers = this.listeners.get(eventName);
    if (!handlers) {
      return;
    }

    for (const handler of handlers) {
      handler(event);
    }
  }
}

function waitForAsyncWork() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

test("createRawWebSocketRealtimeSocket normalizes http URLs and emits join frames", () => {
  const createdSockets = [];
  const realtimeSocket = createRawWebSocketRealtimeSocket(
    { socketUrl: "http://localhost:8080" },
    {
      createSocketId: () => "socket-local-1",
      createWebSocket(url) {
        const socket = new FakeWebSocket(url);
        createdSockets.push(socket);
        return socket;
      },
    },
  );

  const connected = [];
  realtimeSocket.on("connect", () => {
    connected.push("connected");
  });

  realtimeSocket.connect();
  assert.equal(createdSockets[0].url, "ws://localhost:8080");

  createdSockets[0].readyState = 1;
  createdSockets[0].trigger("open");
  assert.deepEqual(connected, ["connected"]);

  realtimeSocket.emit("join-room", {
    accessToken: "token-1",
    gameRoomId: "room-1",
  });

  assert.deepEqual(createdSockets[0].sent, [
    JSON.stringify({
      event: "join-room",
      data: {
        accessToken: "token-1",
        gameRoomId: "room-1",
      },
    }),
  ]);
});

test("createRawWebSocketRealtimeSocket dispatches parsed inbound event payloads", async () => {
  const createdSockets = [];
  const realtimeSocket = createRawWebSocketRealtimeSocket(
    { socketUrl: "ws://localhost:8080" },
    {
      createSocketId: () => "socket-local-2",
      createWebSocket(url) {
        const socket = new FakeWebSocket(url);
        createdSockets.push(socket);
        return socket;
      },
    },
  );

  const payloads = [];
  realtimeSocket.on("room-participants-updated", (payload) => {
    payloads.push(payload);
  });

  realtimeSocket.connect();
  createdSockets[0].readyState = 1;
  createdSockets[0].trigger("message", {
    data: JSON.stringify({
      event: "room-participants-updated",
      data: {
        gameRoomId: "room-1",
        gameState: { status: "WAITING" },
      },
    }),
  });

  await waitForAsyncWork();

  assert.deepEqual(payloads, [
    {
      gameRoomId: "room-1",
      gameState: { status: "WAITING" },
    },
  ]);
});

test("createRawWebSocketRealtimeSocket ignores malformed inbound frames", async () => {
  const createdSockets = [];
  const realtimeSocket = createRawWebSocketRealtimeSocket(
    { socketUrl: "ws://localhost:8080" },
    {
      createSocketId: () => "socket-local-3",
      createWebSocket(url) {
        const socket = new FakeWebSocket(url);
        createdSockets.push(socket);
        return socket;
      },
    },
  );

  let triggered = false;
  realtimeSocket.on("game-started", () => {
    triggered = true;
  });

  realtimeSocket.connect();
  createdSockets[0].readyState = 1;
  createdSockets[0].trigger("message", {
    data: JSON.stringify({
      type: "game-started",
      payload: {},
    }),
  });

  await waitForAsyncWork();

  assert.equal(triggered, false);
});

test("createRawWebSocketRealtimeSocket emits connect_error when the transport errors before open", () => {
  const createdSockets = [];
  const realtimeSocket = createRawWebSocketRealtimeSocket(
    { socketUrl: "ws://localhost:8080" },
    {
      createSocketId: () => "socket-local-4",
      createWebSocket(url) {
        const socket = new FakeWebSocket(url);
        createdSockets.push(socket);
        return socket;
      },
    },
  );

  const errors = [];
  realtimeSocket.on("connect_error", (error) => {
    errors.push(error);
  });

  realtimeSocket.connect();
  createdSockets[0].trigger("error");

  assert.equal(errors.length, 1);
  assert.equal(errors[0] instanceof Error, true);
  assert.equal(errors[0].message, "websocket error");
});

test("createRawWebSocketRealtimeSocket emits parsed disconnect reasons from server close events", () => {
  const createdSockets = [];
  const realtimeSocket = createRawWebSocketRealtimeSocket(
    { socketUrl: "ws://localhost:8080" },
    {
      createSocketId: () => "socket-local-5",
      createWebSocket(url) {
        const socket = new FakeWebSocket(url);
        createdSockets.push(socket);
        return socket;
      },
    },
  );

  const disconnectReasons = [];
  realtimeSocket.on("disconnect", (reason) => {
    disconnectReasons.push(reason);
  });

  realtimeSocket.connect();
  createdSockets[0].readyState = 1;
  createdSockets[0].trigger("open");
  createdSockets[0].trigger("close", {
    code: 4401,
    reason: "AUTH_TOKEN_INVALID",
  });

  assert.deepEqual(disconnectReasons, ["4401: AUTH_TOKEN_INVALID"]);
});
