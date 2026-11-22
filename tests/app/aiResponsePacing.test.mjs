import test from "node:test";
import assert from "node:assert/strict";
import {
  AI_RESPONSE_DELAY_MAX_MS,
  AI_RESPONSE_DELAY_MIN_MS,
  getAiResponseDelayMs,
  getAiThinkingMessage,
  getRemainingAiResponseDelayMs,
} from "../../src/features/ai-chat/aiResponsePacing.ts";

test("AI response pacing varies with message length and random jitter", () => {
  const shortDelay = getAiResponseDelayMs("방", () => 0);
  const longDelay = getAiResponseDelayMs("친구들과 함께 할 게임 방을 만들어줘", () => 0);
  const jitteredDelay = getAiResponseDelayMs("방", () => 0.8);

  assert.ok(shortDelay >= AI_RESPONSE_DELAY_MIN_MS);
  assert.ok(longDelay > shortDelay);
  assert.ok(jitteredDelay > shortDelay);
  assert.ok(jitteredDelay <= AI_RESPONSE_DELAY_MAX_MS);
});

test("AI response pacing adds only the delay not already spent on the server", () => {
  assert.equal(
    getRemainingAiResponseDelayMs({ startedAt: 1000, now: 1400, targetDelayMs: 1200 }),
    800,
  );
  assert.equal(
    getRemainingAiResponseDelayMs({ startedAt: 1000, now: 2500, targetDelayMs: 1200 }),
    0,
  );
});

test("AI thinking copy reflects common chat commands", () => {
  assert.equal(getAiThinkingMessage("쉬운 방 만들어줘"), "알맞은 게임 방 설정을 확인하고 있어요");
  assert.equal(getAiThinkingMessage("친구 초대해줘"), "친구 초대 요청을 확인하고 있어요");
  assert.equal(getAiThinkingMessage("게임 시작해줘"), "게임 시작 조건을 확인하고 있어요");
  assert.equal(getAiThinkingMessage("잘 모르겠어"), "요청 내용을 이해하고 있어요");
});
