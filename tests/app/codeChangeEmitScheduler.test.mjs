import test from "node:test";
import assert from "node:assert/strict";
import { createCodeChangeEmitScheduler } from "../../src/features/editor/codeChangeEmitScheduler.ts";
import { resolveCodeChangeFlushPayload } from "../../src/features/editor/codeChangeFlushPolicy.ts";

const eligibleSnapshot = {
  gameRoomId: "room-1",
  userId: "user-1",
  sessionId: "socket-1",
};

const eligibleSchedule = {
  wasEligibleAtSchedule: true,
  emitSnapshot: eligibleSnapshot,
};

function createTrackingScheduler(options) {
  let currentContext = options.initialContext;
  const flushed = [];

  const scheduler = createCodeChangeEmitScheduler({
    debounceMs: options.debounceMs ?? 50,
    onFlush: (filePath, codeDelta, pending) => {
      const payload = resolveCodeChangeFlushPayload(
        filePath,
        codeDelta,
        pending,
        currentContext,
      );

      if (payload) {
        flushed.push(payload);
      }
    },
  });

  return {
    scheduler,
    flushed,
    setContext(nextContext) {
      currentContext = nextContext;
    },
  };
}

test("createCodeChangeEmitScheduler keeps pending edits per file", async () => {
  const tracking = createTrackingScheduler({
    initialContext: {
      canEmit: true,
      connectionStatus: "connected",
      gameRoomId: "room-1",
      userId: "user-1",
      socketId: "socket-1",
    },
  });

  tracking.scheduler.schedule("a.py", "", "a", eligibleSchedule);
  tracking.scheduler.schedule("b.py", "", "b", eligibleSchedule);

  await new Promise((resolve) => setTimeout(resolve, 80));

  assert.equal(tracking.flushed.length, 2);
  assert.deepEqual(
    tracking.flushed.map((entry) => entry.filePath).sort(),
    ["a.py", "b.py"],
  );

  tracking.scheduler.dispose();
});

test("createCodeChangeEmitScheduler coalesces rapid edits on the same file into one full delta", async () => {
  const tracking = createTrackingScheduler({
    initialContext: {
      canEmit: true,
      connectionStatus: "connected",
      gameRoomId: "room-1",
      userId: "user-1",
      socketId: "socket-1",
    },
  });

  tracking.scheduler.schedule("main.py", "", "a", eligibleSchedule);
  tracking.scheduler.schedule("main.py", "a", "ab", eligibleSchedule);

  await new Promise((resolve) => setTimeout(resolve, 80));

  assert.equal(tracking.flushed.length, 1);
  assert.deepEqual(tracking.flushed[0].codeDelta, {
    rangeStart: 0,
    rangeEnd: 0,
    insertedText: "ab",
  });

  tracking.scheduler.dispose();
});

test("createCodeChangeEmitScheduler preserves full text after multiple edits within debounce window", async () => {
  const tracking = createTrackingScheduler({
    debounceMs: 200,
    initialContext: {
      canEmit: true,
      connectionStatus: "connected",
      gameRoomId: "room-1",
      userId: "user-1",
      socketId: "socket-1",
    },
  });

  tracking.scheduler.schedule("main.py", "", "a", eligibleSchedule);
  tracking.scheduler.schedule("main.py", "a", "ab", eligibleSchedule);

  await new Promise((resolve) => setTimeout(resolve, 250));

  assert.equal(tracking.flushed.length, 1);
  assert.deepEqual(tracking.flushed[0].codeDelta, {
    rangeStart: 0,
    rangeEnd: 0,
    insertedText: "ab",
  });

  tracking.scheduler.dispose();
});

test("flushes pending edit scheduled while eligible after canEmit becomes false", async () => {
  const tracking = createTrackingScheduler({
    initialContext: {
      canEmit: true,
      connectionStatus: "connected",
      gameRoomId: "room-1",
      userId: "user-1",
      socketId: "socket-1",
    },
  });

  tracking.scheduler.schedule("main.py", "", "a", eligibleSchedule);
  tracking.scheduler.schedule("main.py", "a", "ab", eligibleSchedule);

  tracking.setContext({
    canEmit: false,
    connectionStatus: "connected",
    gameRoomId: "room-1",
    userId: "user-1",
    socketId: "socket-1",
  });

  await new Promise((resolve) => setTimeout(resolve, 80));

  assert.equal(tracking.flushed.length, 1);
  assert.deepEqual(tracking.flushed[0].codeDelta, {
    rangeStart: 0,
    rangeEnd: 0,
    insertedText: "ab",
  });
  assert.deepEqual(tracking.flushed[0].emitSnapshot, eligibleSnapshot);

  tracking.scheduler.dispose();
});

test("flushes pending edit scheduled while eligible after connection becomes closed", async () => {
  const tracking = createTrackingScheduler({
    initialContext: {
      canEmit: true,
      connectionStatus: "connected",
      gameRoomId: "room-1",
      userId: "user-1",
      socketId: "socket-1",
    },
  });

  tracking.scheduler.schedule("main.py", "", "ab", eligibleSchedule);

  tracking.setContext({
    canEmit: false,
    connectionStatus: "closed",
    gameRoomId: "room-1",
    userId: "user-1",
    socketId: null,
  });

  await new Promise((resolve) => setTimeout(resolve, 80));

  assert.equal(tracking.flushed.length, 1);
  assert.deepEqual(tracking.flushed[0].emitSnapshot, eligibleSnapshot);

  tracking.scheduler.dispose();
});

test("drops pending edit that was never eligible and flush happens after connection closes", async () => {
  const tracking = createTrackingScheduler({
    initialContext: {
      canEmit: false,
      connectionStatus: "connected",
      gameRoomId: "room-1",
      userId: "user-1",
      socketId: "socket-1",
    },
  });

  tracking.scheduler.schedule("main.py", "", "ab", {
    wasEligibleAtSchedule: false,
    emitSnapshot: null,
  });

  await new Promise((resolve) => setTimeout(resolve, 80));

  assert.equal(tracking.flushed.length, 0);

  tracking.scheduler.dispose();
});

test("dispose flushes pending eligible edits immediately", () => {
  const tracking = createTrackingScheduler({
    initialContext: {
      canEmit: true,
      connectionStatus: "connected",
      gameRoomId: "room-1",
      userId: "user-1",
      socketId: "socket-1",
    },
  });

  tracking.scheduler.schedule("main.py", "", "ab", eligibleSchedule);
  tracking.scheduler.dispose();

  assert.equal(tracking.flushed.length, 1);
  assert.deepEqual(tracking.flushed[0].codeDelta, {
    rangeStart: 0,
    rangeEnd: 0,
    insertedText: "ab",
  });
});
