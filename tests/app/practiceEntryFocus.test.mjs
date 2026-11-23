import test from "node:test";
import assert from "node:assert/strict";
import {
  PRACTICE_ENTRY_SELECTOR,
  scrollPracticeEntryIntoView,
} from "../../src/features/practice/practiceEntryFocus.ts";

test("practice entry request scrolls the practice card into view", () => {
  let receivedOptions = null;
  const target = {
    scrollIntoView(options) {
      receivedOptions = options;
    },
  };
  const root = {
    querySelector(selector) {
      assert.equal(selector, PRACTICE_ENTRY_SELECTOR);
      return target;
    },
  };

  assert.equal(scrollPracticeEntryIntoView(root), true);
  assert.deepEqual(receivedOptions, {
    behavior: "smooth",
    block: "start",
  });
});

test("practice entry scroll safely skips a missing card", () => {
  const root = {
    querySelector() {
      return null;
    },
  };

  assert.equal(scrollPracticeEntryIntoView(root), false);
});
