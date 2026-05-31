import test from "node:test";
import assert from "node:assert/strict";
import {
  applyAuthoritativeEditorFiles,
  applyEditorFileReset,
  convergeWorkingFilesToAuthoritative,
  onEditorTurnIdChanged,
} from "../../src/features/editor/editorTurnBaseline.ts";
import {
  applyGameStarted,
  applyGameStateUpdated,
  bootstrapEditorFromMission,
} from "../../src/features/realtime/realtimeEventReducers.ts";
import { createAppStore } from "../../src/app/store/clientState.ts";

function createEditor(overrides = {}) {
  return {
    files: {},
    authoritativeFiles: {},
    activeFilePath: "main.py",
    markers: [],
    turnBaselineFiles: {},
    turnBaselineTurnId: null,
    turnBaselineReady: false,
    ...overrides,
  };
}

function seedStore(store) {
  store.setState((state) => ({
    ...state,
    realtime: {
      ...state.realtime,
      activeRoomId: "room-1",
    },
    room: {
      ...state.room,
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
    },
  }));
}

test("onEditorTurnIdChanged snapshots authoritative content, not dirty local buffers", () => {
  const editor = createEditor({
    files: { "main.py": "local-only dirty" },
    authoritativeFiles: { "main.py": "server starter" },
    turnBaselineTurnId: "turn-1",
    turnBaselineFiles: { "main.py": "server starter" },
    turnBaselineReady: true,
  });

  const nextTurn = onEditorTurnIdChanged(editor, "turn-2");

  assert.equal(nextTurn.turnBaselineTurnId, "turn-2");
  assert.deepEqual(nextTurn.turnBaselineFiles, { "main.py": "server starter" });
  assert.equal(nextTurn.files["main.py"], "server starter");
});

test("convergeWorkingFilesToAuthoritative clears dirty local-only content", () => {
  const editor = createEditor({
    files: { "main.py": "local-only dirty" },
    authoritativeFiles: { "main.py": "server starter" },
  });

  assert.deepEqual(convergeWorkingFilesToAuthoritative(editor), {
    "main.py": "server starter",
  });
});

test("applyAuthoritativeEditorFiles seeds the first-turn baseline after initial sync", () => {
  const editor = createEditor({
    files: { "main.py": "" },
    turnBaselineTurnId: "turn-1",
    turnBaselineReady: false,
  });

  const synced = applyAuthoritativeEditorFiles(
    editor,
    { "main.py": "print('starter')\n" },
    "turn-1",
  );

  assert.deepEqual(synced.authoritativeFiles, { "main.py": "print('starter')\n" });
  assert.equal(synced.turnBaselineReady, true);
  assert.deepEqual(synced.turnBaselineFiles, {
    "main.py": "print('starter')\n",
  });

  const reset = applyEditorFileReset(
    { ...synced, files: { "main.py": "local edits" } },
    "main.py",
    "turn-1",
  );
  assert.equal(reset.files["main.py"], "print('starter')\n");
});

test("applyAuthoritativeEditorFiles does not overwrite an established turn baseline", () => {
  const editor = createEditor({
    authoritativeFiles: { "main.py": "turn-start" },
    turnBaselineTurnId: "turn-1",
    turnBaselineFiles: { "main.py": "turn-start" },
    turnBaselineReady: true,
    files: { "main.py": "turn-start" },
  });

  const later = applyAuthoritativeEditorFiles(
    editor,
    { "main.py": "mid-turn authoritative" },
    "turn-1",
  );

  assert.deepEqual(later.authoritativeFiles, {
    "main.py": "mid-turn authoritative",
  });
  assert.deepEqual(later.turnBaselineFiles, { "main.py": "turn-start" });
});

test("applyGameStarted does not pin baseline to empty bootstrapped buffers", () => {
  const store = createAppStore();
  seedStore(store);

  const event = {
    gameRoomId: "room-1",
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
    missionState: {
      missionId: "mission-1",
      projectStructure: {
        rootPath: "/workspace",
        entryFilePath: "main.py",
        files: [
          {
            filePath: "main.py",
            language: "python",
            readonly: false,
          },
        ],
      },
    },
    uiHints: { enterGameScreen: false, showMissionGuideModal: false },
    occurredAt: "2026-05-25T10:10:00Z",
  };

  store.setState((state) => applyGameStarted(state, event).state);

  const editor = store.getState().editor;
  assert.equal(editor.turnBaselineTurnId, "turn-1");
  assert.equal(editor.turnBaselineReady, false);
  assert.deepEqual(editor.turnBaselineFiles, {});
});

test("applyGameStateUpdated advances turn baseline from authoritative state only", () => {
  const store = createAppStore();
  seedStore(store);

  store.setState((state) => ({
    ...state,
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
    },
    editor: applyAuthoritativeEditorFiles(
      onEditorTurnIdChanged(
        bootstrapEditorFromMission({
          missionId: "mission-1",
          projectStructure: {
            rootPath: "/workspace",
            entryFilePath: "main.py",
            files: [
              { filePath: "main.py", language: "python", readonly: false },
            ],
          },
        }),
        "turn-1",
      ),
      { "main.py": "authoritative turn-1" },
      "turn-1",
    ),
  }));

  store.setState((state) => ({
    ...state,
    editor: {
      ...state.editor,
      files: { "main.py": "local-only dirty from turn-1" },
      authoritativeFiles: { "main.py": "authoritative turn-2 start" },
      turnBaselineTurnId: "turn-1",
      turnBaselineFiles: { "main.py": "authoritative turn-1" },
      turnBaselineReady: true,
    },
  }));

  store.setState((state) =>
    applyGameStateUpdated(state, {
      gameRoomId: "room-1",
      gameState: {
        status: "IN_PROGRESS",
        turnState: {
          turnId: "turn-2",
          turnNumber: 2,
          currentPlayerId: "user-2",
          startedAt: "2026-05-25T10:11:00Z",
          deadlineAt: "2026-05-25T10:11:30Z",
          timeLimitSeconds: 30,
          remainingTimeSeconds: 30,
          status: "IN_PROGRESS",
        },
      },
      missionState: null,
    }),
  );

  const editor = store.getState().editor;
  assert.equal(editor.turnBaselineTurnId, "turn-2");
  assert.deepEqual(editor.turnBaselineFiles, {
    "main.py": "authoritative turn-2 start",
  });
  assert.equal(editor.files["main.py"], "authoritative turn-2 start");
});
