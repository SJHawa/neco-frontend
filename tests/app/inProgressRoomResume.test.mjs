import assert from "node:assert/strict";
import test from "node:test";
import { resolveInProgressRoomResumeTarget } from "../../src/pages/MainPage/mainInitialization.ts";

function room(overrides = {}) {
  return {
    gameRoomId: "room-1",
    status: "IN_PROGRESS",
    ...overrides,
  };
}

test("returns the gameplay route for the same authoritative in-progress room", () => {
  assert.equal(
    resolveInProgressRoomResumeTarget({
      serverCurrentRoom: room(),
      storedCurrentRoom: room(),
      gameState: { status: "IN_PROGRESS" },
      missionState: { missionId: "mission-1" },
    }),
    "/rooms/room-1/play",
  );
});

test("waits for realtime synchronization when gameplay data is incomplete", () => {
  assert.equal(
    resolveInProgressRoomResumeTarget({
      serverCurrentRoom: room(),
      storedCurrentRoom: room(),
      gameState: { status: "IN_PROGRESS" },
      missionState: null,
    }),
    null,
  );
});

test("does not resume a different or finished room", () => {
  assert.equal(
    resolveInProgressRoomResumeTarget({
      serverCurrentRoom: room(),
      storedCurrentRoom: room({ gameRoomId: "room-2" }),
      gameState: { status: "IN_PROGRESS" },
      missionState: { missionId: "mission-1" },
    }),
    null,
  );
  assert.equal(
    resolveInProgressRoomResumeTarget({
      serverCurrentRoom: room({ status: "FINISHED" }),
      storedCurrentRoom: room({ status: "FINISHED" }),
      gameState: { status: "FINISHED" },
      missionState: { missionId: "mission-1" },
    }),
    null,
  );
});
