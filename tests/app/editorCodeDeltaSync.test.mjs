import test from "node:test";
import assert from "node:assert/strict";
import { applyCodeDeltaToEditor } from "../../src/features/editor/editorCodeDeltaSync.ts";

test("applyCodeDeltaToEditor updates working files without touching authoritative state", () => {
  const next = applyCodeDeltaToEditor(
    {
      files: { "main.py": "print('a')" },
      authoritativeFiles: { "main.py": "print('a')" },
      activeFilePath: "main.py",
      markers: [],
      turnBaselineFiles: {},
      turnBaselineTurnId: null,
      turnBaselineReady: false,
    },
    "main.py",
    {
      rangeStart: 8,
      rangeEnd: 8,
      insertedText: "x",
    },
  );

  assert.equal(next.files["main.py"], "print('ax')");
  assert.equal(next.authoritativeFiles["main.py"], "print('a')");
});
