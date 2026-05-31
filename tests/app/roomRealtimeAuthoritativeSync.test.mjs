import test from "node:test";
import assert from "node:assert/strict";
import { createAppStore } from "../../src/app/store/clientState.ts";
import {
  extractAuthoritativeFilesFromCodeUpdated,
  isSameClientCodeUpdatedEcho,
} from "../../src/features/editor/authoritativeEditorSync.ts";
import { applyCodeUpdated } from "../../src/features/realtime/realtimeEventReducers.ts";
import { bindRoomRealtimeEvents } from "../../src/features/realtime/roomRealtimeEvents.ts";

function createFakeSocket() {
  const handlers = new Map();

  return {
    socket: {
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

function seedActiveGameplayStore(store, overrides = {}) {
  store.setState((state) => ({
    ...state,
    auth: {
      ...state.auth,
      user: {
        userId: "user-1",
        loginId: "player",
        nickname: "Player",
        email: null,
      },
      isAuthenticated: true,
    },
    realtime: {
      ...state.realtime,
      activeRoomId: "room-1",
      socketId: "socket-local",
      ...overrides.realtime,
    },
    game: {
      ...state.game,
      gameState: {
        status: "IN_PROGRESS",
        turnState: {
          turnId: "turn-1",
          turnNumber: 1,
          currentPlayerId: "user-1",
          startedAt: "2026-05-25T10:10:00Z",
          deadlineAt: "2026-05-25T10:10:30Z",
          timeLimitSeconds: 30,
          remainingTimeSeconds: 30,
          status: "IN_PROGRESS",
        },
      },
      ...overrides.game,
    },
    editor: {
      ...state.editor,
      files: { "main.py": "" },
      activeFilePath: "main.py",
      turnBaselineTurnId: "turn-1",
      turnBaselineReady: false,
      ...overrides.editor,
    },
  }));
}

test("isSameClientCodeUpdatedEcho matches sessionId only", () => {
  assert.equal(isSameClientCodeUpdatedEcho("socket-local", "socket-local"), true);
  assert.equal(isSameClientCodeUpdatedEcho("socket-local", "socket-other"), false);
  assert.equal(isSameClientCodeUpdatedEcho(null, "socket-local"), false);
  assert.equal(isSameClientCodeUpdatedEcho("socket-local", undefined), false);
});

test("extractAuthoritativeFilesFromCodeUpdated uses optional content only", () => {
  assert.deepEqual(
    extractAuthoritativeFilesFromCodeUpdated({
      gameRoomId: "room-1",
      userId: "user-2",
      sessionId: "socket-remote",
      filePath: "main.py",
      codeDelta: { rangeStart: 0, rangeEnd: 0, insertedText: "x" },
      occurredAt: "2026-05-25T10:10:05Z",
    }),
    null,
  );

  assert.deepEqual(
    extractAuthoritativeFilesFromCodeUpdated({
      gameRoomId: "room-1",
      userId: "user-2",
      sessionId: "socket-remote",
      filePath: "main.py",
      codeDelta: {},
      content: "print('starter')\n",
      occurredAt: "2026-05-25T10:10:05Z",
    }),
    { "main.py": "print('starter')\n" },
  );
});

test("applyCodeUpdated accepts same-user events from a different client session", () => {
  const store = createAppStore();
  seedActiveGameplayStore(store);

  store.setState((state) =>
    applyCodeUpdated(state, {
      gameRoomId: "room-1",
      userId: "user-1",
      sessionId: "socket-other-tab",
      filePath: "main.py",
      codeDelta: {},
      content: "print('from other tab')\n",
      occurredAt: "2026-05-25T10:10:05Z",
    }),
  );

  assert.equal(
    store.getState().editor.authoritativeFiles["main.py"],
    "print('from other tab')\n",
  );
});

test("bindRoomRealtimeEvents suppresses only same-session code-updated echoes", () => {
  const store = createAppStore();
  seedActiveGameplayStore(store);

  const fake = createFakeSocket();
  const unbind = bindRoomRealtimeEvents(fake.socket, store);

  fake.socket.trigger("code-updated", {
    gameRoomId: "room-1",
    userId: "user-1",
    sessionId: "socket-local",
    filePath: "main.py",
    codeDelta: {},
    content: "print('echo')\n",
    occurredAt: "2026-05-25T10:10:05Z",
  });

  assert.deepEqual(store.getState().editor.authoritativeFiles, {});

  fake.socket.trigger("code-updated", {
    gameRoomId: "room-1",
    userId: "user-2",
    sessionId: "socket-remote",
    filePath: "main.py",
    codeDelta: {},
    content: "print('starter')\n",
    occurredAt: "2026-05-25T10:10:06Z",
  });

  const editor = store.getState().editor;
  assert.equal(editor.authoritativeFiles["main.py"], "print('starter')\n");
  assert.equal(editor.files["main.py"], "print('starter')\n");
  assert.equal(editor.turnBaselineReady, true);

  unbind();
});

test("bindRoomRealtimeEvents accepts legacy code-updated without sessionId when content is present", () => {
  const store = createAppStore();
  seedActiveGameplayStore(store);

  const fake = createFakeSocket();
  bindRoomRealtimeEvents(fake.socket, store);

  fake.socket.trigger("code-updated", {
    gameRoomId: "room-1",
    userId: "user-2",
    filePath: "main.py",
    codeDelta: {},
    content: "print('legacy starter')\n",
    occurredAt: "2026-05-25T10:10:05Z",
  });

  const editor = store.getState().editor;
  assert.equal(editor.authoritativeFiles["main.py"], "print('legacy starter')\n");
  assert.equal(editor.files["main.py"], "print('legacy starter')\n");
  assert.equal(editor.turnBaselineReady, true);
});

test("applyCodeUpdated without sessionId still applies authoritative content", () => {
  const store = createAppStore();
  seedActiveGameplayStore(store);

  store.setState((state) =>
    applyCodeUpdated(state, {
      gameRoomId: "room-1",
      userId: "user-1",
      filePath: "main.py",
      codeDelta: {},
      content: "print('no session id')\n",
      occurredAt: "2026-05-25T10:10:05Z",
    }),
  );

  assert.equal(
    store.getState().editor.authoritativeFiles["main.py"],
    "print('no session id')\n",
  );
});

test("bindRoomRealtimeEvents applies delta-only code-updated to working editor files", () => {
  const store = createAppStore();
  seedActiveGameplayStore(store);

  const fake = createFakeSocket();
  bindRoomRealtimeEvents(fake.socket, store);

  fake.socket.trigger("code-updated", {
    gameRoomId: "room-1",
    userId: "user-2",
    sessionId: "socket-remote",
    filePath: "main.py",
    codeDelta: {
      rangeStart: 0,
      rangeEnd: 0,
      insertedText: "x",
    },
    occurredAt: "2026-05-25T10:10:05Z",
  });

  assert.deepEqual(store.getState().editor.authoritativeFiles, {});
  assert.equal(store.getState().editor.files["main.py"], "x");
});

test("applyCodeUpdated merges optional content then applies delta", () => {
  const store = createAppStore();
  seedActiveGameplayStore(store);

  store.setState((state) =>
    applyCodeUpdated(state, {
      gameRoomId: "room-1",
      userId: "user-2",
      sessionId: "socket-remote",
      filePath: "main.py",
      codeDelta: {
        rangeStart: 10,
        rangeEnd: 10,
        insertedText: "!",
      },
      content: "print('a')",
      occurredAt: "2026-05-25T10:10:05Z",
    }),
  );

  const editor = store.getState().editor;
  assert.equal(editor.authoritativeFiles["main.py"], "print('a')");
  assert.equal(editor.files["main.py"], "print('a')!");
});
