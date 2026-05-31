import { buildTextRangeDelta, type TextRangeDelta } from "./codeDelta";
import type {
  CodeChangeScheduleEligibility,
  PendingCodeChangeEdit,
} from "./codeChangeFlushPolicy";

export type CodeChangeEmitScheduler = {
  schedule: (
    filePath: string,
    previousText: string,
    nextText: string,
    eligibility: CodeChangeScheduleEligibility,
  ) => void;
  dispose: () => void;
};

export type CodeChangeFlushHandler = (
  filePath: string,
  codeDelta: TextRangeDelta,
  pending: PendingCodeChangeEdit,
) => void;

export type CreateCodeChangeEmitSchedulerOptions = {
  debounceMs: number;
  onFlush: CodeChangeFlushHandler;
  setTimer?: typeof setTimeout;
  clearTimer?: typeof clearTimeout;
};

export function createCodeChangeEmitScheduler({
  debounceMs,
  onFlush,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
}: CreateCodeChangeEmitSchedulerOptions): CodeChangeEmitScheduler {
  const pendingByFile = new Map<string, PendingCodeChangeEdit>();
  const timersByFile = new Map<string, ReturnType<typeof setTimeout>>();

  function flushFile(filePath: string) {
    timersByFile.delete(filePath);
    const pending = pendingByFile.get(filePath);
    pendingByFile.delete(filePath);

    if (!pending) {
      return;
    }

    const codeDelta = buildTextRangeDelta(pending.anchorText, pending.currentText);
    if (codeDelta) {
      onFlush(filePath, codeDelta, pending);
    }
  }

  function flushAllPending() {
    for (const timerId of timersByFile.values()) {
      clearTimer(timerId);
    }
    timersByFile.clear();

    const filePaths = [...pendingByFile.keys()];
    for (const filePath of filePaths) {
      flushFile(filePath);
    }
  }

  return {
    schedule(filePath, previousText, nextText, eligibility) {
      if (previousText === nextText) {
        return;
      }

      const existing = pendingByFile.get(filePath);
      if (existing) {
        existing.currentText = nextText;
      } else {
        pendingByFile.set(filePath, {
          anchorText: previousText,
          currentText: nextText,
          wasEligibleAtSchedule: eligibility.wasEligibleAtSchedule,
          emitSnapshot: eligibility.emitSnapshot,
        });
      }

      const existingTimer = timersByFile.get(filePath);
      if (existingTimer !== undefined) {
        clearTimer(existingTimer);
      }

      timersByFile.set(
        filePath,
        setTimer(() => {
          flushFile(filePath);
        }, debounceMs),
      );
    },
    dispose() {
      flushAllPending();
    },
  };
}
