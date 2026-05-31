import test from "node:test";
import assert from "node:assert/strict";
import { createAppStore } from "../../src/app/store/clientState.ts";
import {
  applyGameStarted,
  applyGameStateUpdated,
  applyRoomParticipantsUpdated,
  bootstrapEditorFromMission,
  shouldRetainRoomSocketForPath,
} from "../../src/features/realtime/realtimeEventReducers.ts";
import { bindRoomRealtimeEvents } from "../../src/features/realtime/roomRealtimeEvents.ts";
import { setRealtimeNavigateHandler } from "../../src/features/realtime/realtimeNavigation.ts";

function createRoom(overrides = {}) {
  return {
    gameRoomId: "room-1",
    status: "WAITING",
    difficulty: "NORMAL",
    ownerUserId: "owner-1",
    myRole: "OWNER",
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

function seedStore(store, overrides = {}) {
  store.setState((state) => ({
    ...state,
    room: {
      ...state.room,
      currentRoom: createRoom(),
      roomWaitingState: {
        currentRoom: createRoom(),
        participants: [
          {
            userId: "user-1",
            nickname: "A",
            role: "OWNER",
            membershipStatus: "JOINED",
          },
        ],
        changedParticipant: null,
        gameState: { status: "WAITING" },
        missionState: null,
      },
    },
    realtime: {
      ...state.realtime,
      activeRoomId: "room-1",
      connectionStatus: "connected",
    },
    ...overrides,
  }));
}

test("shouldRetainRoomSocketForPath keeps sockets on /main and same-room gameplay routes", () => {
  assert.equal(shouldRetainRoomSocketForPath("/main", "room-1"), true);
  assert.equal(shouldRetainRoomSocketForPath("/rooms/room-1/play", "room-1"), true);
  assert.equal(shouldRetainRoomSocketForPath("/rooms/room-1/result", "room-1"), true);
  assert.equal(shouldRetainRoomSocketForPath("/rooms/room-2/play", "room-1"), false);
  assert.equal(shouldRetainRoomSocketForPath("/login", "room-1"), false);
});

test("applyRoomParticipantsUpdated persists participants and included game/mission state", () => {
  const store = createAppStore();
  seedStore(store);

  const event = {
    gameRoomId: "room-1",
    participants: [
      {
        userId: "user-1",
        nickname: "A",
        role: "OWNER",
        membershipStatus: "JOINED",
      },
      {
        userId: "user-2",
        nickname: "B",
        role: "PARTICIPANT",
        membershipStatus: "LEFT",
      },
    ],
    changedParticipant: {
      userId: "user-2",
      nickname: "B",
      role: "PARTICIPANT",
      membershipStatus: "LEFT",
    },
    gameState: {
      status: "WAITING",
      difficulty: "HARD",
      timeLimitSeconds: 45,
      maxStrikeCount: 5,
      minParticipants: 2,
      maxParticipants: 4,
    },
    missionState: null,
    occurredAt: "2026-05-25T10:10:00Z",
  };

  store.setState((state) => applyRoomParticipantsUpdated(state, event));
  const next = store.getState();

  assert.deepEqual(next.realtime.participants, event.participants);
  assert.deepEqual(next.game.gameState, event.gameState);
  assert.equal(next.game.missionState, null);
  assert.equal(next.room.currentRoom.joinedParticipantCount, 1);
  assert.equal(next.room.currentRoom.difficulty, "HARD");
  assert.deepEqual(next.room.roomWaitingState.participants, event.participants);
  assert.deepEqual(
    next.room.roomWaitingState.changedParticipant,
    event.changedParticipant,
  );
});

test("applyGameStarted bootstraps gameplay state and only routes when enterGameScreen is true", () => {
  const store = createAppStore();
  seedStore(store);

  const event = {
    gameRoomId: "room-1",
    gameState: {
      status: "IN_PROGRESS",
      strikeCount: 0,
      maxStrikeCount: 3,
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
      title: "짝수 찾기",
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
    uiHints: {
      enterGameScreen: true,
      showMissionGuideModal: true,
    },
    occurredAt: "2026-05-25T10:10:00Z",
  };

  const withNavigation = applyGameStarted(store.getState(), event);
  assert.equal(withNavigation.navigationTarget, "/rooms/room-1/play");
  assert.equal(withNavigation.state.game.gameState.status, "IN_PROGRESS");
  assert.equal(withNavigation.state.game.showMissionGuideModal, true);
  assert.equal(
    withNavigation.state.editor.activeFilePath,
    "main.py",
  );
  assert.deepEqual(withNavigation.state.editor.files, { "main.py": "" });
  assert.equal(withNavigation.state.editor.turnBaselineTurnId, "turn-1");
  assert.equal(withNavigation.state.editor.turnBaselineReady, false);
  assert.deepEqual(withNavigation.state.editor.turnBaselineFiles, {});
  assert.deepEqual(withNavigation.state.editor.authoritativeFiles, {});

  const withoutNavigation = applyGameStarted(store.getState(), {
    ...event,
    uiHints: {
      enterGameScreen: false,
      showMissionGuideModal: false,
    },
  });
  assert.equal(withoutNavigation.navigationTarget, null);
  assert.equal(withoutNavigation.state.game.showMissionGuideModal, false);
});

test("applyGameStateUpdated merges partial game and mission state for the active room", () => {
  const store = createAppStore();
  seedStore(store, {
    game: {
      gameState: {
        status: "IN_PROGRESS",
        strikeCount: 0,
        maxStrikeCount: 3,
        turnState: {
          turnId: "turn-1",
          turnNumber: 1,
          currentPlayerId: "user-1",
          startedAt: "2026-05-25T10:10:00Z",
          deadlineAt: "2026-05-25T10:10:30Z",
          timeLimitSeconds: 30,
          remainingTimeSeconds: 20,
          status: "IN_PROGRESS",
        },
      },
      missionState: {
        missionId: "mission-1",
        title: "Before",
      },
      showMissionGuideModal: false,
      lastTurnEvaluation: null,
      missionResult: null,
    },
  });

  store.setState((state) =>
    applyGameStateUpdated(state, {
      gameRoomId: "room-1",
      gameState: {
        status: "IN_PROGRESS",
        strikeCount: 2,
      },
      missionState: {
        missionId: "mission-1",
        title: "After",
      },
    }),
  );

  const next = store.getState();
  assert.equal(next.game.gameState.strikeCount, 2);
  assert.equal(next.game.gameState.turnState.turnId, "turn-1");
  assert.equal(next.game.missionState.title, "After");
  assert.equal(next.room.currentRoom.status, "IN_PROGRESS");
});

test("bindRoomRealtimeEvents routes to play only on game-started with enterGameScreen", () => {
  const store = createAppStore();
  seedStore(store);
  const navigated = [];
  setRealtimeNavigateHandler((path) => {
    navigated.push(path);
  });

  const handlers = new Map();
  const socket = {
    on(eventName, handler) {
      handlers.set(eventName, handler);
    },
    off(eventName) {
      handlers.delete(eventName);
    },
  };

  bindRoomRealtimeEvents(socket, store);

  handlers.get("room-participants-updated")({
    gameRoomId: "room-1",
    participants: [],
    changedParticipant: null,
    gameState: { status: "WAITING" },
    missionState: null,
    occurredAt: "2026-05-25T10:00:00Z",
  });
  assert.equal(navigated.length, 0);
  assert.equal(store.getState().game.gameState.status, "WAITING");

  handlers.get("game-started")({
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
    uiHints: { enterGameScreen: true, showMissionGuideModal: false },
    occurredAt: "2026-05-25T10:10:00Z",
  });

  assert.deepEqual(navigated, ["/rooms/room-1/play"]);
  assert.equal(store.getState().game.gameState.status, "IN_PROGRESS");

  handlers.get("game-state-updated")({
    gameRoomId: "room-1",
    gameState: { status: "IN_PROGRESS", strikeCount: 1 },
    missionState: null,
  });

  assert.equal(store.getState().game.gameState.strikeCount, 1);
  assert.equal(navigated.length, 1);

  setRealtimeNavigateHandler(null);
});

test("bootstrapEditorFromMission resets file buffers for a new mission bootstrap", () => {
  const editor = bootstrapEditorFromMission({
    missionId: "mission-1",
    projectStructure: {
      rootPath: "/workspace",
      entryFilePath: "main.py",
      files: [{ filePath: "main.py", language: "python", readonly: false }],
    },
  });

  assert.equal(editor.files["main.py"], "");
  assert.equal(editor.activeFilePath, "main.py");
  assert.deepEqual(editor.markers, []);
  assert.deepEqual(editor.authoritativeFiles, {});
  assert.deepEqual(editor.turnBaselineFiles, {});
  assert.equal(editor.turnBaselineTurnId, null);
  assert.equal(editor.turnBaselineReady, false);
});
