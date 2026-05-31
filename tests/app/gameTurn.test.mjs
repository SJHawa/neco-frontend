import test from "node:test";
import assert from "node:assert/strict";
import { buildTurnCodeSnapshot } from "../../src/features/game-turn/buildTurnCodeSnapshot.ts";

test("buildTurnCodeSnapshot uses mission project files when available", () => {
  const snapshot = buildTurnCodeSnapshot(
    {
      "main.py": "print(1)",
      "utils.py": "unused",
    },
    {
      missionId: "mission-1",
      projectStructure: {
        rootPath: "/workspace",
        entryFilePath: "main.py",
        files: [
          { filePath: "main.py", language: "python", readonly: false },
          { filePath: "readme.md", language: "markdown", readonly: true },
        ],
      },
    },
  );

  assert.deepEqual(snapshot, {
    files: [
      { filePath: "main.py", content: "print(1)" },
      { filePath: "readme.md", content: "" },
    ],
  });
});

test("buildTurnCodeSnapshot falls back to editor file keys without mission structure", () => {
  const snapshot = buildTurnCodeSnapshot(
    { "main.py": "print(2)" },
    null,
  );

  assert.deepEqual(snapshot, {
    files: [{ filePath: "main.py", content: "print(2)" }],
  });
});
