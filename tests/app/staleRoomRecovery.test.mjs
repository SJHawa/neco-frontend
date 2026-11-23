import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../../src/app/store/clientState.ts";
import { clearStaleRoomClientState } from "../../src/pages/MainPage/mainInitialization.ts";

test("authoritative empty current-room response clears stale in-progress client state", () => {
  const state = createInitialState();
  state.auth.user = { userId: "user-1", nickname: "성민" };
  state.room.currentRoom = {
    gameRoomId: "room-1",
    status: "IN_PROGRESS",
    mode: "PRACTICE",
  };
  state.game.gameState = { status: "IN_PROGRESS" };
  state.game.missionState = { missionId: "mission-1" };
  state.editor.files = { "main.py": "print('stale')" };
  state.realtime.activeRoomId = "room-1";
  state.realtime.connectionStatus = "connected";

  const recovered = clearStaleRoomClientState(state);

  assert.equal(recovered.auth.user?.userId, "user-1");
  assert.equal(recovered.room.currentRoom, null);
  assert.equal(recovered.room.roomWaitingState, null);
  assert.equal(recovered.game.gameState, null);
  assert.equal(recovered.game.missionState, null);
  assert.deepEqual(recovered.editor.files, {});
  assert.equal(recovered.realtime.activeRoomId, null);
  assert.equal(recovered.realtime.connectionStatus, "idle");
});
