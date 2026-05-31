import test from "node:test";
import assert from "node:assert/strict";
import {
  applyTextRangeDelta,
  buildTextRangeDelta,
  hasApplicableCodeDelta,
} from "../../src/features/editor/codeDelta.ts";

test("buildTextRangeDelta computes insert and delete ranges", () => {
  assert.deepEqual(buildTextRangeDelta("hello", "hellxo"), {
    rangeStart: 4,
    rangeEnd: 4,
    insertedText: "x",
  });

  assert.deepEqual(buildTextRangeDelta("hello", "hel"), {
    rangeStart: 3,
    rangeEnd: 5,
    insertedText: "",
  });
});

test("applyTextRangeDelta applies reflected range payloads", () => {
  assert.equal(
    applyTextRangeDelta("print('a')", {
      rangeStart: 8,
      rangeEnd: 8,
      insertedText: "x",
    }),
    "print('ax')",
  );
});

test("hasApplicableCodeDelta rejects empty or partial payloads", () => {
  assert.equal(hasApplicableCodeDelta({}), false);
  assert.equal(
    hasApplicableCodeDelta({
      rangeStart: 0,
      rangeEnd: 0,
      insertedText: "x",
    }),
    true,
  );
});
