import assert from "node:assert/strict";
import test from "node:test";

import {
  PRACTICE_TUTORIAL_STEPS,
  getPracticeTutorialStorageKey,
  markPracticeTutorialDone,
  shouldStartPracticeTutorial,
} from "../../src/features/onboarding/practiceTutorial.ts";

function createStorage() {
  const values = new Map();

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

test("practice tutorial covers the main personal-practice controls", () => {
  assert.deepEqual(
    PRACTICE_TUTORIAL_STEPS.map((step) => step.id),
    ["mission", "editor", "progress", "ai-master", "items"],
  );
  assert.ok(PRACTICE_TUTORIAL_STEPS.every((step) => step.target.length > 0));
});

test("practice tutorial completion is stored separately for each user", () => {
  const storage = createStorage();

  assert.equal(shouldStartPracticeTutorial(storage, "user-1"), true);
  markPracticeTutorialDone(storage, "user-1");

  assert.equal(shouldStartPracticeTutorial(storage, "user-1"), false);
  assert.equal(shouldStartPracticeTutorial(storage, "user-2"), true);
  assert.notEqual(
    getPracticeTutorialStorageKey("user-1"),
    getPracticeTutorialStorageKey("user-2"),
  );
});
