import test from "node:test";
import assert from "node:assert/strict";
import {
  MAIN_TUTORIAL_STEPS,
  getMainTutorialStorageKey,
  markMainTutorialDone,
  shouldStartMainTutorial,
} from "../../src/features/onboarding/mainTutorial.ts";

function createMemoryStorage() {
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

test("main tutorial covers the introduction, chat, practice, and ranking entry points", () => {
  assert.deepEqual(
    MAIN_TUTORIAL_STEPS.map((step) => step.id),
    ["intro", "ai-chat", "practice", "ranking"],
  );
});

test("main tutorial completion is stored separately for each user", () => {
  const storage = createMemoryStorage();

  assert.equal(shouldStartMainTutorial(storage, "user-1"), true);
  markMainTutorialDone(storage, "user-1");

  assert.equal(shouldStartMainTutorial(storage, "user-1"), false);
  assert.equal(shouldStartMainTutorial(storage, "user-2"), true);
  assert.notEqual(getMainTutorialStorageKey("user-1"), getMainTutorialStorageKey("user-2"));
});
