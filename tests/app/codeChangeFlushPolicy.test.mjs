import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCodeChangeScheduleEligibility,
  resolveCodeChangeEmitSnapshot,
} from "../../src/features/editor/codeChangeFlushPolicy.ts";

test("buildCodeChangeScheduleEligibility captures snapshot only when emit is allowed", () => {
  assert.deepEqual(
    buildCodeChangeScheduleEligibility({
      canEmit: true,
      connectionStatus: "connected",
      gameRoomId: "room-1",
      userId: "user-1",
      socketId: "socket-1",
    }),
    {
      wasEligibleAtSchedule: true,
      emitSnapshot: {
        gameRoomId: "room-1",
        userId: "user-1",
        sessionId: "socket-1",
      },
    },
  );

  assert.deepEqual(
    buildCodeChangeScheduleEligibility({
      canEmit: false,
      connectionStatus: "connected",
      gameRoomId: "room-1",
      userId: "user-1",
      socketId: "socket-1",
    }),
    {
      wasEligibleAtSchedule: false,
      emitSnapshot: null,
    },
  );
});

test("resolveCodeChangeEmitSnapshot keeps schedule-time snapshot after canEmit becomes false", () => {
  const pending = {
    anchorText: "",
    currentText: "ab",
    wasEligibleAtSchedule: true,
    emitSnapshot: {
      gameRoomId: "room-1",
      userId: "user-1",
      sessionId: "socket-1",
    },
  };

  assert.deepEqual(
    resolveCodeChangeEmitSnapshot(pending, {
      canEmit: false,
      connectionStatus: "connected",
      gameRoomId: "room-1",
      userId: "user-1",
      socketId: "socket-1",
    }),
    pending.emitSnapshot,
  );
});

test("resolveCodeChangeEmitSnapshot returns null for never-eligible pending after disconnect", () => {
  const pending = {
    anchorText: "",
    currentText: "ab",
    wasEligibleAtSchedule: false,
    emitSnapshot: null,
  };

  assert.equal(
    resolveCodeChangeEmitSnapshot(pending, {
      canEmit: false,
      connectionStatus: "closed",
      gameRoomId: "room-1",
      userId: "user-1",
      socketId: null,
    }),
    null,
  );
});
