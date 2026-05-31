import test from "node:test";
import assert from "node:assert/strict";
import {
  formatHintDisplayText,
  getCachedHint,
  getHintCacheKey,
  resolveHintCacheKeyFromMission,
  shouldRefetchHintOnOpen,
} from "../../src/features/hint/hintCache.ts";

const nullHintResponse = {
  missionId: "mission-1",
  gameRoomMissionStepId: "step-1",
  missionTemplateStepId: "template-1",
  hintText: null,
};

test("getHintCacheKey prefers gameRoomMissionStepId", () => {
  assert.equal(
    getHintCacheKey({
      gameRoomMissionStepId: "step-1",
      missionTemplateStepId: "template-1",
    }),
    "step-1",
  );

  assert.equal(
    getHintCacheKey({
      gameRoomMissionStepId: null,
      missionTemplateStepId: "template-1",
    }),
    "template:template-1",
  );
});

test("getCachedHint returns stored HintResponse when hintText is null", () => {
  const cache = {
    "step-1": nullHintResponse,
  };

  assert.deepEqual(getCachedHint(cache, "step-1"), nullHintResponse);
  assert.equal(getCachedHint(cache, "step-missing"), undefined);
});

test("shouldRefetchHintOnOpen treats hintText null cache entry as hit", () => {
  const cache = {
    "step-1": nullHintResponse,
  };

  assert.equal(shouldRefetchHintOnOpen(cache, "step-1"), false);
  assert.equal(shouldRefetchHintOnOpen(cache, "step-missing"), true);
  assert.equal(
    shouldRefetchHintOnOpen(
      cache,
      resolveHintCacheKeyFromMission({ gameRoomMissionStepId: "step-1" }),
    ),
    false,
  );
});

test("formatHintDisplayText handles null and blank hints", () => {
  assert.match(formatHintDisplayText(null), /힌트가 없습니다/);
  assert.equal(formatHintDisplayText("  hello  "), "hello");
});
