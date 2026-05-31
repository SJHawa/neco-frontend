import type { CodeDelta } from "../../shared/types/domain";

export type TextRangeDelta = {
  rangeStart: number;
  rangeEnd: number;
  insertedText: string;
};

export function hasApplicableCodeDelta(codeDelta: CodeDelta | undefined | null) {
  if (!codeDelta) {
    return false;
  }

  return (
    typeof codeDelta.rangeStart === "number" &&
    Number.isFinite(codeDelta.rangeStart) &&
    typeof codeDelta.rangeEnd === "number" &&
    Number.isFinite(codeDelta.rangeEnd) &&
    typeof codeDelta.insertedText === "string"
  );
}

export function buildTextRangeDelta(
  previousText: string,
  nextText: string,
): TextRangeDelta | null {
  if (previousText === nextText) {
    return null;
  }

  let prefixLength = 0;
  const maxPrefix = Math.min(previousText.length, nextText.length);

  while (
    prefixLength < maxPrefix &&
    previousText[prefixLength] === nextText[prefixLength]
  ) {
    prefixLength += 1;
  }

  let suffixLength = 0;
  const previousRemainder = previousText.length - prefixLength;
  const nextRemainder = nextText.length - prefixLength;

  while (
    suffixLength < previousRemainder &&
    suffixLength < nextRemainder &&
    previousText[previousText.length - 1 - suffixLength] ===
      nextText[nextText.length - 1 - suffixLength]
  ) {
    suffixLength += 1;
  }

  const rangeStart = prefixLength;
  const rangeEnd = previousText.length - suffixLength;
  const insertedText = nextText.slice(prefixLength, nextText.length - suffixLength);

  return {
    rangeStart,
    rangeEnd,
    insertedText,
  };
}

export function applyTextRangeDelta(text: string, delta: TextRangeDelta | CodeDelta) {
  if (!hasApplicableCodeDelta(delta)) {
    return text;
  }

  const rangeStart = Math.max(0, Math.min(text.length, delta.rangeStart as number));
  const rangeEnd = Math.max(
    rangeStart,
    Math.min(text.length, delta.rangeEnd as number),
  );
  const insertedText = delta.insertedText as string;

  return `${text.slice(0, rangeStart)}${insertedText}${text.slice(rangeEnd)}`;
}
