import type { MissionResult } from "../../shared/types/domain";

type MissionResultStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
};

const MISSION_RESULT_STORAGE_PREFIX = "neconaeco.missionResult";

export type ExecutionErrorPresentation = {
  kind: string;
  title: string;
  description: string;
  suggestion: string;
  location: string | null;
  rawMessage: string | null;
};

export type MissionResultPresentationContext = {
  missionTemplateId?: string | null;
};

const STANDARD_INPUT_CALCULATOR_TEMPLATE_ID =
  "22222222-2222-4222-8222-222222222222";

type CalculatorFailureTemplate = Omit<
  ExecutionErrorPresentation,
  "location" | "rawMessage"
> & {
  casePattern: RegExp;
};

const CALCULATOR_FAILURE_TEMPLATES: CalculatorFailureTemplate[] = [
  {
    kind: "CALCULATOR_INVALID_NUMBER",
    casePattern: /^invalid_(left|right)_number$/i,
    title: "숫자 입력을 확인해 주세요",
    description: "왼쪽 또는 오른쪽 입력이 숫자가 아닐 때의 처리가 기대한 결과와 달라요.",
    suggestion: "숫자 변환을 try/except ValueError로 감싸고, 변환할 수 없으면 정확히 'ERROR: invalid number'를 출력해 주세요.",
  },
  {
    kind: "CALCULATOR_DIVISION_BY_ZERO",
    casePattern: /^division_by_zero$/i,
    title: "0으로 나누는 경우를 먼저 처리해 주세요",
    description: "오른쪽 숫자가 0인 나눗셈에서 약속된 오류 문구가 출력되지 않았어요.",
    suggestion: "나눗셈을 계산하기 전에 오른쪽 숫자가 0인지 확인하고, 정확히 'ERROR: division by zero'를 출력해 주세요.",
  },
  {
    kind: "CALCULATOR_UNSUPPORTED_OPERATOR",
    casePattern: /^unsupported_operator$/i,
    title: "지원하지 않는 연산자를 처리해 주세요",
    description: "+, -, *, / 이외의 연산자가 들어왔을 때의 결과가 달라요.",
    suggestion: "연산자 조건문의 마지막 else에서 정확히 'ERROR: unsupported operator'를 출력해 주세요.",
  },
  {
    kind: "CALCULATOR_DIVIDE",
    casePattern: /^divide_/i,
    title: "나눗셈 결과를 확인해 주세요",
    description: "나눗셈 결과가 테스트에서 기대한 값과 달라요.",
    suggestion: "연산자가 '/'일 때 왼쪽 숫자를 오른쪽 숫자로 나누세요. 결과가 정수이면 소수점 없이, 아니면 소수로 출력해 주세요.",
  },
  {
    kind: "CALCULATOR_MULTIPLY",
    casePattern: /^multiply_/i,
    title: "곱셈 결과를 확인해 주세요",
    description: "'*' 연산의 계산 결과가 테스트에서 기대한 값과 달라요.",
    suggestion: "연산자가 '*'일 때 왼쪽 숫자와 오른쪽 숫자를 곱한 결과를 출력해 주세요.",
  },
  {
    kind: "CALCULATOR_SUBTRACT",
    casePattern: /^subtract_/i,
    title: "뺄셈 순서를 확인해 주세요",
    description: "'-' 연산의 계산 결과가 테스트에서 기대한 값과 달라요.",
    suggestion: "연산자가 '-'일 때 반드시 '왼쪽 숫자 - 오른쪽 숫자' 순서로 계산해 주세요.",
  },
  {
    kind: "CALCULATOR_ADD",
    casePattern: /^add_/i,
    title: "덧셈 결과를 확인해 주세요",
    description: "'+' 연산의 계산 결과가 테스트에서 기대한 값과 달라요.",
    suggestion: "연산자가 '+'일 때 숫자로 변환한 왼쪽 값과 오른쪽 값을 더해 출력해 주세요.",
  },
];

type ExecutionErrorTemplate = Omit<ExecutionErrorPresentation, "location" | "rawMessage"> & {
  pattern: RegExp;
};

const EXECUTION_ERROR_TEMPLATES: ExecutionErrorTemplate[] = [
  {
    kind: "INDENTATION",
    pattern: /IndentationError|TabError|expected an indented block/i,
    title: "들여쓰기를 확인해 주세요",
    description: "Python은 코드 앞의 공백으로 실행 범위를 구분해요.",
    suggestion: "if, elif, else, 함수 다음 줄을 같은 깊이로 4칸 들여써 주세요.",
  },
  {
    kind: "SYNTAX",
    pattern: /SyntaxError|invalid syntax|was never closed|unterminated string/i,
    title: "문법이 완성되지 않았어요",
    description: "Python이 코드의 문장 구조를 이해하지 못했어요.",
    suggestion: "콜론(:), 괄호, 따옴표가 빠졌거나 짝이 맞지 않는지 확인해 주세요.",
  },
  {
    kind: "NAME",
    pattern: /NameError|is not defined/i,
    title: "정의되지 않은 이름을 사용했어요",
    description: "사용한 변수나 함수의 이름을 Python이 찾지 못했어요.",
    suggestion: "이름의 철자와 대소문자를 확인하고, 사용하기 전에 먼저 값을 만들어 주세요.",
  },
  {
    kind: "TYPE",
    pattern: /TypeError/i,
    title: "자료형이 맞지 않아요",
    description: "현재 값의 종류로는 해당 연산을 수행할 수 없어요.",
    suggestion: "문자열과 숫자를 함께 계산하고 있지 않은지 확인하고 int() 또는 str()로 변환해 주세요.",
  },
  {
    kind: "VALUE",
    pattern: /ValueError|invalid literal/i,
    title: "값을 변환할 수 없어요",
    description: "입력값의 형태가 코드에서 기대한 형태와 달라요.",
    suggestion: "숫자로 바꾸기 전에 입력값이 실제 숫자인지 확인해 주세요.",
  },
  {
    kind: "INDEX",
    pattern: /IndexError|index out of range/i,
    title: "목록의 범위를 벗어났어요",
    description: "목록이나 문자열에 존재하지 않는 위치를 사용했어요.",
    suggestion: "사용한 인덱스가 0부터 길이보다 1 작은 값 사이인지 확인해 주세요.",
  },
  {
    kind: "KEY",
    pattern: /KeyError/i,
    title: "딕셔너리에 없는 키예요",
    description: "딕셔너리에 저장되지 않은 이름으로 값을 찾았어요.",
    suggestion: "키가 있는지 먼저 확인하거나 dict.get()을 사용해 주세요.",
  },
  {
    kind: "ZERO_DIVISION",
    pattern: /ZeroDivisionError|division by zero/i,
    title: "0으로 나눌 수 없어요",
    description: "나누는 수가 0이어서 계산을 계속할 수 없어요.",
    suggestion: "나눗셈 전에 나누는 값이 0인지 확인해 주세요.",
  },
  {
    kind: "INPUT",
    pattern: /EOFError|EOF when reading a line/i,
    title: "입력 개수가 맞지 않아요",
    description: "코드가 준비된 테스트 입력보다 더 많은 값을 읽으려고 했어요.",
    suggestion: "문제에서 안내한 입력 줄 수만큼만 input()을 호출했는지 확인해 주세요.",
  },
  {
    kind: "IMPORT",
    pattern: /ModuleNotFoundError|ImportError|No module named/i,
    title: "모듈을 불러오지 못했어요",
    description: "현재 실행 환경에서 사용할 수 없는 모듈을 불러왔어요.",
    suggestion: "모듈 이름의 철자를 확인하고 기본 Python 기능으로 해결할 수 있는지 살펴보세요.",
  },
  {
    kind: "RECURSION",
    pattern: /RecursionError|maximum recursion depth exceeded/i,
    title: "함수 호출이 끝나지 않아요",
    description: "함수가 자기 자신을 너무 많이 반복해서 호출했어요.",
    suggestion: "재귀 함수가 멈추는 조건이 반드시 실행되는지 확인해 주세요.",
  },
];

function getMissionResultStorageKey(gameRoomId: string) {
  return `${MISSION_RESULT_STORAGE_PREFIX}.${gameRoomId}`;
}

function getBrowserSessionStorage(): MissionResultStorage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function isMissionResult(value: unknown): value is MissionResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<MissionResult>;
  return (
    typeof candidate.missionId === "string" &&
    typeof candidate.isMissionCleared === "boolean" &&
    typeof candidate.judgeStatus === "string"
  );
}

export function formatMissionExecutionResult(result: MissionResult) {
  const legacyOutputs = result.actualOutputs;

  if (Array.isArray(legacyOutputs) && legacyOutputs.length > 0) {
    const output = legacyOutputs[legacyOutputs.length - 1];

    if (Array.isArray(output)) {
      return `[${output.map((value) => JSON.stringify(value)).join(", ")}]`;
    }

    if (typeof output === "string") {
      return output;
    }

    return JSON.stringify(output);
  }

  const stdout = result.executionSummary?.stdout?.trim();
  return stdout || null;
}

function getExecutionErrorLocation(message: string) {
  const match = message.match(/File\s+["']([^"']+)["'],\s+line\s+(\d+)/i);
  if (!match) {
    return null;
  }

  const fileName = match[1].split(/[\\/]/).pop() ?? match[1];
  return `${fileName} ${match[2]}번째 줄`;
}

function getDetectedIssueLocation(result: MissionResult) {
  const issue = result.detectedIssues.find(
    ({ filePath, lineNumber }) => Boolean(filePath) || typeof lineNumber === "number",
  );
  if (!issue) return null;

  const fileName = issue.filePath?.split(/[\\/]/).pop() ?? "main.py";
  return typeof issue.lineNumber === "number"
    ? `${fileName} ${issue.lineNumber}번째 줄`
    : fileName;
}

function getCalculatorFailurePresentation(
  result: MissionResult,
  context: MissionResultPresentationContext,
): ExecutionErrorPresentation | null {
  const caseNames = result.detectedIssues
    .map(({ caseName }) => caseName)
    .filter((caseName): caseName is string => Boolean(caseName));
  const matchedTemplate = CALCULATOR_FAILURE_TEMPLATES.find(({ casePattern }) =>
    caseNames.some((caseName) => casePattern.test(caseName)),
  );
  const isCalculatorMission =
    context.missionTemplateId === STANDARD_INPUT_CALCULATOR_TEMPLATE_ID ||
    Boolean(matchedTemplate);
  if (!isCalculatorMission) return null;

  const executionMessage = [
    result.executionSummary?.stderr,
    result.executionSummary?.runtimeFailureMessage,
  ].find((value) => value?.trim())?.trim();
  const issueMessage = result.detectedIssues
    .map(({ message }) => message?.trim())
    .find(Boolean);
  const rawMessage = executionMessage ?? issueMessage ?? null;
  const searchableMessage = [executionMessage, issueMessage].filter(Boolean).join("\n");
  const location =
    getExecutionErrorLocation(searchableMessage) ?? getDetectedIssueLocation(result);

  if (/ValueError|invalid literal/i.test(searchableMessage)) {
    return {
      kind: "CALCULATOR_INVALID_NUMBER",
      title: "숫자가 아닌 입력도 처리해 주세요",
      description: "입력값을 바로 숫자로 바꾸는 과정에서 실행이 멈췄어요.",
      suggestion: "두 숫자의 변환을 try/except ValueError로 감싸고, 실패하면 정확히 'ERROR: invalid number'를 출력해 주세요.",
      location,
      rawMessage,
    };
  }

  if (/ZeroDivisionError|division by zero/i.test(searchableMessage)) {
    return {
      kind: "CALCULATOR_DIVISION_BY_ZERO",
      title: "0으로 나누기 전에 확인이 필요해요",
      description: "오른쪽 숫자가 0인 상태에서 나눗셈을 실행해 코드가 멈췄어요.",
      suggestion: "나눗셈보다 먼저 오른쪽 숫자가 0인지 검사하고, 정확히 'ERROR: division by zero'를 출력해 주세요.",
      location,
      rawMessage,
    };
  }

  if (/EOFError|EOF when reading a line/i.test(searchableMessage)) {
    return {
      kind: "CALCULATOR_INPUT_COUNT",
      title: "입력은 세 줄만 읽어야 해요",
      description: "계산기 테스트는 왼쪽 숫자, 연산자, 오른쪽 숫자를 한 줄씩 전달해요.",
      suggestion: "input()을 정확히 세 번 사용해 왼쪽 숫자 → 연산자 → 오른쪽 숫자 순서로 읽어 주세요.",
      location,
      rawMessage,
    };
  }

  if (!matchedTemplate) return null;

  return {
    kind: matchedTemplate.kind,
    title: matchedTemplate.title,
    description: matchedTemplate.description,
    suggestion: matchedTemplate.suggestion,
    location,
    rawMessage,
  };
}

export function getExecutionErrorPresentation(
  result: MissionResult,
): ExecutionErrorPresentation | null {
  const execution = result.executionSummary;
  if (!execution) {
    return null;
  }

  const rawMessage = [execution.stderr, execution.runtimeFailureMessage]
    .find((value) => value?.trim())
    ?.trim() ?? null;
  const searchableMessage = [
    execution.stderr,
    execution.runtimeFailureCode,
    execution.runtimeFailureMessage,
  ].filter(Boolean).join("\n");

  if (
    execution.status === "TIMEOUT" ||
    /TIMEOUT|timed out|time limit/i.test(searchableMessage)
  ) {
    return {
      kind: "TIMEOUT",
      title: "실행 시간이 너무 길어요",
      description: "코드가 제한 시간 안에 실행을 마치지 못했어요.",
      suggestion: "끝나지 않는 반복문이 있는지 확인하고 반복 횟수를 줄여 주세요.",
      location: getExecutionErrorLocation(searchableMessage),
      rawMessage,
    };
  }

  const template = EXECUTION_ERROR_TEMPLATES.find(({ pattern }) =>
    pattern.test(searchableMessage),
  );

  if (template) {
    return {
      kind: template.kind,
      title: template.title,
      description: template.description,
      suggestion: template.suggestion,
      location: getExecutionErrorLocation(searchableMessage),
      rawMessage,
    };
  }

  return {
    kind: "UNKNOWN",
    title: "코드 실행 중 문제가 발생했어요",
    description: "코드를 실행했지만 정상적으로 끝나지 않았어요.",
    suggestion: "최근에 작성한 부분의 문법과 입력 처리부터 차례대로 확인해 주세요.",
    location: getExecutionErrorLocation(searchableMessage),
    rawMessage,
  };
}

export function getMissionResultPresentation(
  result: MissionResult,
  context: MissionResultPresentationContext = {},
) {
  const isSuccess = result.judgeStatus === "PASSED" || result.isMissionCleared;
  const executionOutput = formatMissionExecutionResult(result);
  const runtimeStatus = result.executionSummary?.status;
  const hasRuntimeError =
    !isSuccess &&
    (runtimeStatus === "FAILED" || runtimeStatus === "TIMEOUT" || result.judgeStatus === "ERROR");
  const calculatorFailure = !isSuccess
    ? getCalculatorFailurePresentation(result, context)
    : null;
  const executionError =
    calculatorFailure ??
    (hasRuntimeError ? getExecutionErrorPresentation(result) : null);

  return {
    isSuccess,
    executionLabel: executionError?.title ?? (hasRuntimeError ? "실행 오류" : "테스트 출력"),
    executionError,
    executionOutput: isSuccess
      ? null
      : executionError
      ? null
      : executionOutput,
  };
}

export function saveMissionResultSession(
  gameRoomId: string,
  result: MissionResult,
  storage: MissionResultStorage | null = getBrowserSessionStorage(),
) {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(getMissionResultStorageKey(gameRoomId), JSON.stringify(result));
  } catch {
    // The live Zustand result remains available when browser storage is unavailable.
  }
}

export function loadMissionResultSession(
  gameRoomId: string | undefined,
  storage: MissionResultStorage | null = getBrowserSessionStorage(),
) {
  if (!gameRoomId || !storage) {
    return null;
  }

  try {
    const serialized = storage.getItem(getMissionResultStorageKey(gameRoomId));
    if (!serialized) {
      return null;
    }

    const parsed: unknown = JSON.parse(serialized);
    return isMissionResult(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearMissionResultSession(
  gameRoomId: string,
  storage: MissionResultStorage | null = getBrowserSessionStorage(),
) {
  try {
    storage?.removeItem?.(getMissionResultStorageKey(gameRoomId));
  } catch {
    // A stale result is harmless when browser storage cannot be updated.
  }
}
