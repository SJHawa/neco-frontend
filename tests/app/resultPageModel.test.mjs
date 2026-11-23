import test from "node:test";
import assert from "node:assert/strict";
import {
  formatMissionExecutionResult,
  getMissionResultPresentation,
  loadMissionResultSession,
  saveMissionResultSession,
} from "../../src/features/game-result/missionResultModel.ts";

function createStorage() {
  const values = new Map();

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
  };
}

function createBackendMissionResult(overrides = {}) {
  return {
    missionId: "mission-1",
    isMissionCleared: false,
    judgeStatus: "FAILED",
    strikeCount: 3,
    remainingStrikeCount: 0,
    feedbackMessage: "failed",
    detectedIssues: [],
    executionSummary: {
      status: "FAILED",
      exitCode: 1,
      stdout: "",
      stderr: "failed",
    },
    ...overrides,
  };
}

test("formatMissionExecutionResult tolerates backend results without legacy outputs", () => {
  assert.equal(formatMissionExecutionResult(createBackendMissionResult()), null);
});

test("formatMissionExecutionResult uses backend execution stdout for success", () => {
  const result = createBackendMissionResult({
    isMissionCleared: true,
    judgeStatus: "PASSED",
    executionSummary: {
      status: "SUCCESS",
      exitCode: 0,
      stdout: "42\n",
      stderr: "",
    },
  });

  assert.equal(formatMissionExecutionResult(result), "42");
});

test("formatMissionExecutionResult preserves a legacy scalar string", () => {
  const result = createBackendMissionResult({ actualOutputs: ["42"] });

  assert.equal(formatMissionExecutionResult(result), "42");
});

test("passed judge output is hidden from the result screen", () => {
  const presentation = getMissionResultPresentation(
    createBackendMissionResult({
      isMissionCleared: true,
      judgeStatus: "PASSED",
      executionSummary: {
        status: "SUCCESS",
        exitCode: 0,
        stdout: "ERROR: invalid number\n",
        stderr: "",
      },
    }),
  );

  assert.equal(presentation.isSuccess, true);
  assert.equal(presentation.executionOutput, null);
});

test("runtime failures use a friendly type-error template and retain details", () => {
  const presentation = getMissionResultPresentation(
    createBackendMissionResult({
      judgeStatus: "ERROR",
      executionSummary: {
        status: "FAILED",
        exitCode: 1,
        stdout: "partial output",
        stderr: "TypeError: invalid input\n",
      },
    }),
  );

  assert.equal(presentation.isSuccess, false);
  assert.equal(presentation.executionLabel, "자료형이 맞지 않아요");
  assert.equal(presentation.executionOutput, null);
  assert.deepEqual(presentation.executionError, {
    kind: "TYPE",
    title: "자료형이 맞지 않아요",
    description: "현재 값의 종류로는 해당 연산을 수행할 수 없어요.",
    suggestion: "문자열과 숫자를 함께 계산하고 있지 않은지 확인하고 int() 또는 str()로 변환해 주세요.",
    location: null,
    rawMessage: "TypeError: invalid input",
  });
});

test("indentation failures explain the location and how to fix the block", () => {
  const presentation = getMissionResultPresentation(
    createBackendMissionResult({
      judgeStatus: "ERROR",
      executionSummary: {
        status: "FAILED",
        exitCode: 1,
        stdout: "",
        stderr: 'File "/workspace/main.py", line 11\nIndentationError: expected an indented block',
      },
    }),
  );

  assert.equal(presentation.executionError?.kind, "INDENTATION");
  assert.equal(presentation.executionError?.title, "들여쓰기를 확인해 주세요");
  assert.equal(presentation.executionError?.location, "main.py 11번째 줄");
  assert.match(presentation.executionError?.suggestion ?? "", /4칸 들여써/);
});

test("timeouts explain likely infinite loops without exposing a generic error", () => {
  const presentation = getMissionResultPresentation(
    createBackendMissionResult({
      judgeStatus: "ERROR",
      executionSummary: {
        status: "TIMEOUT",
        exitCode: 124,
        stdout: "",
        stderr: "",
        runtimeFailureCode: "RUNTIME_TIMEOUT",
        runtimeFailureMessage: "Execution timed out",
      },
    }),
  );

  assert.equal(presentation.executionError?.kind, "TIMEOUT");
  assert.equal(presentation.executionError?.title, "실행 시간이 너무 길어요");
  assert.match(presentation.executionError?.suggestion ?? "", /반복문/);
});

test("unknown runtime failures use a safe fallback template", () => {
  const presentation = getMissionResultPresentation(
    createBackendMissionResult({
      judgeStatus: "ERROR",
      executionSummary: {
        status: "FAILED",
        exitCode: 1,
        stdout: "",
        stderr: "runner exited unexpectedly",
      },
    }),
  );

  assert.equal(presentation.executionError?.kind, "UNKNOWN");
  assert.equal(presentation.executionError?.title, "코드 실행 중 문제가 발생했어요");
});

test("calculator addition failures explain the operation instead of only showing raw output", () => {
  const presentation = getMissionResultPresentation(
    createBackendMissionResult({
      executionSummary: { status: "SUCCESS", exitCode: 0, stdout: "6", stderr: "" },
      detectedIssues: [{
        issueType: "PUBLIC_TEST_CASE_FAILED",
        caseName: "add_positive_integers",
        message: '공개 테스트 "add_positive_integers" 실패: expected "5", actual "6"',
        filePath: "main.py",
      }],
    }),
  );

  assert.equal(presentation.executionError?.kind, "CALCULATOR_ADD");
  assert.equal(presentation.executionError?.title, "덧셈 결과를 확인해 주세요");
  assert.match(presentation.executionError?.suggestion ?? "", /왼쪽 값과 오른쪽 값/);
  assert.equal(presentation.executionError?.location, "main.py");
  assert.equal(presentation.executionOutput, null);
});

test("calculator division-by-zero failures show the required output text", () => {
  const presentation = getMissionResultPresentation(
    createBackendMissionResult({
      executionSummary: { status: "SUCCESS", exitCode: 0, stdout: "", stderr: "" },
      detectedIssues: [{
        issueType: "PUBLIC_TEST_CASE_FAILED",
        caseName: "division_by_zero",
        message: "division-by-zero output mismatch",
        filePath: "main.py",
      }],
    }),
  );

  assert.equal(presentation.executionError?.kind, "CALCULATOR_DIVISION_BY_ZERO");
  assert.match(presentation.executionError?.suggestion ?? "", /ERROR: division by zero/);
});

test("calculator runtime conversion errors use calculator-specific guidance", () => {
  const presentation = getMissionResultPresentation(
    createBackendMissionResult({
      judgeStatus: "ERROR",
      executionSummary: {
        status: "FAILED",
        exitCode: 1,
        stdout: "",
        stderr: "ValueError: could not convert string to float: 'abc'",
      },
    }),
    { missionTemplateId: "22222222-2222-4222-8222-222222222222" },
  );

  assert.equal(presentation.executionError?.kind, "CALCULATOR_INVALID_NUMBER");
  assert.match(presentation.executionError?.suggestion ?? "", /try\/except ValueError/);
  assert.match(presentation.executionError?.suggestion ?? "", /ERROR: invalid number/);
});

test("mission result session restores the realtime result after a refresh", () => {
  const storage = createStorage();
  const result = createBackendMissionResult();

  saveMissionResultSession("room-1", result, storage);

  assert.deepEqual(loadMissionResultSession("room-1", storage), result);
  assert.equal(loadMissionResultSession("room-2", storage), null);
});
