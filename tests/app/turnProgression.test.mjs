import test from "node:test";
import assert from "node:assert/strict";
import { createAppStore } from "../../src/app/store/clientState.ts";
import {
  applyMissionResult,
  applyTurnChanged,
  applyTurnEvaluated,
} from "../../src/features/realtime/realtimeEventReducers.ts";
import { bindRoomRealtimeEvents } from "../../src/features/realtime/roomRealtimeEvents.ts";
import { setRealtimeNavigateHandler } from "../../src/features/realtime/realtimeNavigation.ts";
import { canEditGameplay } from "../../src/pages/RoomPage/roomPageViewModel.ts";

function seedGameplayStore(store) {
  store.setState((state) => ({
    ...state,
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
          remainingTimeSeconds: 30,
          status: "IN_PROGRESS",
        },
      },
      missionState: {
        missionId: "mission-1",
        title: "Mission",
      },
      showMissionGuideModal: false,
      lastTurnEvaluation: null,
      missionResult: null,
      turnSubmissionPending: true,
      hintsByStepId: {},
    },
    editor: {
      files: { "main.py": "dirty" },
      authoritativeFiles: { "main.py": "clean" },
      activeFilePath: "main.py",
      markers: [],
      turnBaselineFiles: { "main.py": "clean" },
      turnBaselineTurnId: "turn-1",
      turnBaselineReady: true,
    },
    realtime: {
      ...state.realtime,
      activeRoomId: "room-1",
      connectionStatus: "connected",
    },
  }));
}

test("applyTurnEvaluated stores evaluation, markers, and strike counts while keeping submission lock", () => {
  const store = createAppStore();
  seedGameplayStore(store);

  const next = applyTurnEvaluated(store.getState(), {
    gameRoomId: "room-1",
    evaluatedTurn: {
      turnId: "turn-1",
      turnNumber: 1,
      playerUserId: "user-1",
      status: "SUBMITTED",
    },
    evaluationResult: {
      isStepCleared: false,
      judgeStatus: "FAILED",
      strikeCount: 1,
      remainingStrikeCount: 2,
      feedbackMessage: "조건 불일치",
      detectedIssues: [
        {
          issueType: "LOGIC_ERROR",
          message: "짝수 조건 누락",
          filePath: "main.py",
          lineNumber: 3,
        },
      ],
      executionSummary: {
        status: "SUCCESS",
        exitCode: 0,
        stdout: "",
        stderr: "",
      },
    },
    occurredAt: "2026-05-25T10:11:00Z",
  });

  assert.equal(next.game.turnSubmissionPending, true);
  assert.equal(next.game.lastTurnEvaluation.feedbackMessage, "조건 불일치");
  assert.equal(next.game.gameState.strikeCount, 1);
  assert.equal(next.game.gameState.turnState.status, "SUBMITTED");
  assert.equal(next.editor.markers[0].message, "짝수 조건 누락");
});

test("turn-evaluated keeps editor locked for submitter until turn-changed even if turn is still IN_PROGRESS", () => {
  const store = createAppStore();
  seedGameplayStore(store);

  const afterEvaluated = applyTurnEvaluated(store.getState(), {
    gameRoomId: "room-1",
    evaluatedTurn: {
      turnId: "turn-1",
      turnNumber: 1,
      playerUserId: "user-1",
      status: "SUBMITTED",
    },
    evaluationResult: {
      isStepCleared: false,
      judgeStatus: "FAILED",
      strikeCount: 1,
      remainingStrikeCount: 2,
      feedbackMessage: "조건 불일치",
      detectedIssues: [],
      executionSummary: {
        status: "SUCCESS",
        exitCode: 0,
        stdout: "",
        stderr: "",
      },
    },
    occurredAt: "2026-05-25T10:11:00Z",
  });

  assert.equal(canEditGameplay("user-1", afterEvaluated.game.gameState), false);
  assert.equal(afterEvaluated.game.turnSubmissionPending, true);
  assert.equal(
    canEditGameplay("user-1", afterEvaluated.game.gameState) &&
      !afterEvaluated.game.turnSubmissionPending,
    false,
  );
});

test("applyTurnChanged updates turn state, mission state, and resets evaluation on new turn", () => {
  const store = createAppStore();
  seedGameplayStore(store);
  store.setState((state) => ({
    ...state,
    editor: {
      ...state.editor,
      markers: [
        {
          issueType: "LOGIC_ERROR",
          message: "이전 턴 이슈",
          filePath: "main.py",
          lineNumber: 1,
        },
      ],
    },
    game: {
      ...state.game,
      lastTurnEvaluation: {
        isStepCleared: false,
        judgeStatus: "FAILED",
        strikeCount: 1,
        remainingStrikeCount: 2,
        feedbackMessage: "old",
        detectedIssues: [],
        executionSummary: {
          status: "SUCCESS",
          exitCode: 0,
          stdout: "",
          stderr: "",
        },
      },
    },
  }));

  const next = applyTurnChanged(store.getState(), {
    gameRoomId: "room-1",
    missionState: {
      missionId: "mission-1",
      title: "Mission step 2",
      gameRoomMissionStepId: "step-2",
    },
    turnState: {
      turnId: "turn-2",
      turnNumber: 2,
      currentPlayerId: "user-2",
      startedAt: "2026-05-25T10:11:05Z",
      deadlineAt: "2026-05-25T10:11:35Z",
      timeLimitSeconds: 30,
      remainingTimeSeconds: 30,
      status: "IN_PROGRESS",
    },
    nextPlayerId: "user-2",
    turnSnapshotId: "snapshot-1",
  });

  assert.equal(next.game.turnSubmissionPending, false);
  assert.equal(next.game.lastTurnEvaluation, null);
  assert.equal(next.game.gameState.turnState.turnId, "turn-2");
  assert.equal(next.game.missionState.title, "Mission step 2");
  assert.equal(next.editor.turnBaselineTurnId, "turn-2");
  assert.deepEqual(next.editor.files, { "main.py": "clean" });
  assert.deepEqual(next.editor.markers, []);
});

test("applyTurnChanged reconstructs editable next-turn state from backend-first payloads", () => {
  const store = createAppStore();
  seedGameplayStore(store);
  store.setState((state) => ({
    ...state,
    game: {
      ...state.game,
      lastTurnEvaluation: {
        isStepCleared: false,
        judgeStatus: "FAILED",
        strikeCount: 1,
        remainingStrikeCount: 2,
        feedbackMessage: "old",
        detectedIssues: [],
        executionSummary: {
          status: "SUCCESS",
          exitCode: 0,
          stdout: "",
          stderr: "",
        },
      },
    },
  }));

  const next = applyTurnChanged(store.getState(), {
    gameRoomId: "room-1",
    previousTurnId: "turn-1",
    currentTurnId: "turn-2",
    currentTurnUserId: "user-2",
    occurredAt: "2026-05-25T10:11:05Z",
  });

  assert.equal(next.game.turnSubmissionPending, false);
  assert.equal(next.game.lastTurnEvaluation, null);
  assert.equal(next.game.gameState.turnState.turnId, "turn-2");
  assert.equal(next.game.gameState.turnState.currentPlayerId, "user-2");
  assert.equal(next.game.gameState.turnState.turnNumber, 2);
  assert.equal(next.game.gameState.turnState.status, "IN_PROGRESS");
  assert.equal(next.game.gameState.turnState.startedAt, "2026-05-25T10:11:05Z");
  assert.equal(next.game.gameState.turnState.deadlineAt, "2026-05-25T10:11:35.000Z");
  assert.equal(canEditGameplay("user-1", next.game.gameState), false);
  assert.equal(canEditGameplay("user-2", next.game.gameState), true);
});

test("applyMissionResult stores final payload and exposes result navigation target", () => {
  const store = createAppStore();
  seedGameplayStore(store);

  const result = applyMissionResult(store.getState(), {
    gameRoomId: "room-1",
    gameState: { status: "FINISHED" },
    missionResult: {
      missionId: "mission-1",
      isMissionCleared: false,
      judgeStatus: "FAILED",
      selectedInputs: [],
      expectedOutputs: [],
      actualOutputs: [],
      strikeCount: 3,
      remainingStrikeCount: 0,
      feedbackMessage: "미션 실패",
      detectedIssues: [],
    },
  });

  assert.equal(result.navigationTarget, "/rooms/room-1/result");
  assert.equal(result.state.game.missionResult.feedbackMessage, "미션 실패");
  assert.equal(result.state.game.gameState.status, "FINISHED");
});

test("bindRoomRealtimeEvents routes to result on mission-result", () => {
  const store = createAppStore();
  seedGameplayStore(store);
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

  handlers.get("mission-result")({
    gameRoomId: "room-1",
    gameState: { status: "FINISHED" },
    missionResult: {
      missionId: "mission-1",
      isMissionCleared: true,
      judgeStatus: "PASSED",
      selectedInputs: [],
      expectedOutputs: [],
      actualOutputs: [],
      strikeCount: 0,
      remainingStrikeCount: 3,
      feedbackMessage: "성공",
      detectedIssues: [],
    },
  });

  assert.deepEqual(navigated, ["/rooms/room-1/result"]);
  assert.equal(store.getState().game.missionResult.judgeStatus, "PASSED");

  setRealtimeNavigateHandler(null);
});

test("bindRoomRealtimeEvents accepts backend-first turn-changed payloads without turnState", () => {
  const store = createAppStore();
  seedGameplayStore(store);

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

  handlers.get("turn-changed")({
    gameRoomId: "room-1",
    previousTurnId: "turn-1",
    currentTurnId: "turn-2",
    currentTurnUserId: "user-2",
    occurredAt: "2026-05-25T10:11:05Z",
  });

  const next = store.getState();
  assert.equal(next.game.turnSubmissionPending, false);
  assert.equal(next.game.gameState.turnState.turnId, "turn-2");
  assert.equal(next.game.gameState.turnState.currentPlayerId, "user-2");
  assert.equal(next.game.gameState.turnState.status, "IN_PROGRESS");
});
