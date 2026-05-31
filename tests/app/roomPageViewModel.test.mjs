import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMissionFileTabs,
  buildParticipantRows,
  buildStrikeHeartDisplay,
  canEditGameplay,
  canMutateMissionFile,
  computeRemainingSeconds,
  formatTurnTimerText,
  getMissionFileName,
  isEditorContentReadOnly,
  resolveActiveFilePath,
} from "../../src/pages/RoomPage/roomPageViewModel.ts";

test("buildMissionFileTabs prefers mission projectStructure files", () => {
  const tabs = buildMissionFileTabs(
    {
      missionId: "mission-1",
      projectStructure: {
        rootPath: "/workspace",
        entryFilePath: "src/main.py",
        files: [
          {
            filePath: "src/main.py",
            language: "python",
            readonly: false,
          },
          {
            filePath: "src/util.py",
            language: "python",
            readonly: true,
          },
        ],
      },
    },
    { "legacy.py": "ignored" },
  );

  assert.equal(tabs.length, 2);
  assert.equal(tabs[0].fileName, "main.py");
  assert.equal(tabs[1].readonly, true);
});

test("buildMissionFileTabs falls back to editor file keys", () => {
  const tabs = buildMissionFileTabs(null, {
    "main.py": "",
    "sub.py": "",
  });

  assert.deepEqual(
    tabs.map((tab) => tab.filePath),
    ["main.py", "sub.py"],
  );
});

test("resolveActiveFilePath keeps a valid active path or uses the first tab", () => {
  const tabs = [
    { filePath: "a.py", fileName: "a.py", language: "python", readonly: false },
    { filePath: "b.py", fileName: "b.py", language: "python", readonly: false },
  ];

  assert.equal(resolveActiveFilePath("b.py", tabs), "b.py");
  assert.equal(resolveActiveFilePath("missing.py", tabs), "a.py");
  assert.equal(resolveActiveFilePath(null, tabs), "a.py");
});

test("canEditGameplay follows current player and IN_PROGRESS turn status", () => {
  const gameState = {
    status: "IN_PROGRESS",
    turnState: {
      turnId: "turn-1",
      turnNumber: 1,
      currentPlayerId: "user-1",
      startedAt: "2026-05-25T10:00:00Z",
      deadlineAt: "2026-05-25T10:00:30Z",
      timeLimitSeconds: 30,
      remainingTimeSeconds: 30,
      status: "IN_PROGRESS",
    },
  };

  assert.equal(canEditGameplay("user-1", gameState), true);
  assert.equal(canEditGameplay("user-2", gameState), false);
  assert.equal(
    canEditGameplay("user-1", {
      ...gameState,
      turnState: { ...gameState.turnState, status: "SUBMITTED" },
    }),
    false,
  );
});

test("computeRemainingSeconds and formatTurnTimerText derive timer display", () => {
  const deadlineAt = "2026-05-25T10:00:30.000Z";
  const now = Date.parse("2026-05-25T10:00:12.000Z");

  assert.equal(computeRemainingSeconds(deadlineAt, now), 18);
  assert.equal(formatTurnTimerText(18), "00 : 18");
  assert.equal(formatTurnTimerText(125), "02 : 05");
});

test("buildStrikeHeartDisplay computes remaining team lives", () => {
  assert.deepEqual(buildStrikeHeartDisplay(1, 3), {
    remaining: 2,
    lost: 1,
  });
});

test("buildParticipantRows marks current user and current turn", () => {
  const rows = buildParticipantRows(
    [
      {
        userId: "user-1",
        nickname: "Alpha",
        role: "PARTICIPANT",
        membershipStatus: "JOINED",
      },
      {
        userId: "user-2",
        nickname: "Beta",
        role: "OWNER",
        membershipStatus: "JOINED",
      },
      {
        userId: "user-3",
        nickname: "Gamma",
        membershipStatus: "INVITED",
        role: "PARTICIPANT",
      },
    ],
    "user-2",
    "user-1",
  );

  assert.equal(rows.length, 2);
  assert.equal(rows[0].isCurrentUser, true);
  assert.equal(rows[1].roleLabel, "방장");
  assert.equal(rows[1].isCurrentTurn, true);
});

test("getMissionFileName returns the basename", () => {
  assert.equal(getMissionFileName("src/main.py"), "main.py");
});

test("canMutateMissionFile blocks readonly tabs even during an editable turn", () => {
  const readonlyTab = {
    filePath: "src/util.py",
    fileName: "util.py",
    language: "python",
    readonly: true,
  };
  const editableTab = {
    filePath: "src/main.py",
    fileName: "main.py",
    language: "python",
    readonly: false,
  };

  assert.equal(canMutateMissionFile(true, readonlyTab), false);
  assert.equal(canMutateMissionFile(true, editableTab), true);
});

test("isEditorContentReadOnly mirrors RoomPage textarea locking rules", () => {
  const readonlyTab = {
    filePath: "util.py",
    fileName: "util.py",
    language: "python",
    readonly: true,
  };

  assert.equal(
    isEditorContentReadOnly({
      canEditTurn: true,
      tab: readonlyTab,
      isTurnExpired: false,
      isMissionGuideOpen: false,
      isRealtimeUnavailable: false,
    }),
    true,
  );
  assert.equal(
    isEditorContentReadOnly({
      canEditTurn: true,
      tab: { ...readonlyTab, readonly: false },
      isTurnExpired: false,
      isMissionGuideOpen: false,
      isRealtimeUnavailable: false,
    }),
    false,
  );
});
