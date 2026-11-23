export const INDENT_UNIT = "    ";
const INDENT_SIZE = INDENT_UNIT.length;

export type EditorTextEdit = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

export type EditorIndentKeyInput = {
  key: string;
  shiftKey?: boolean;
  language?: string | null;
};

const dedentKeywordPattern = /^(return|pass|break|continue|raise)\b/;

function getLineStart(value: string, position: number) {
  return value.lastIndexOf("\n", position - 1) + 1;
}

function getSelectedLineStarts(value: string, selectionStart: number, selectionEnd: number) {
  const lastPosition =
    selectionEnd > selectionStart && value[selectionEnd - 1] === "\n"
      ? selectionEnd - 1
      : selectionEnd;
  const starts = [getLineStart(value, selectionStart)];

  for (let index = starts[0]; index < lastPosition; index += 1) {
    if (value[index] === "\n") {
      starts.push(index + 1);
    }
  }

  return starts;
}

function countRemovableIndent(value: string, lineStart: number) {
  if (value[lineStart] === "\t") {
    return 1;
  }

  let count = 0;
  while (count < INDENT_SIZE && value[lineStart + count] === " ") {
    count += 1;
  }

  return count;
}

function isPython(language: string | null | undefined) {
  return (language ?? "").toLowerCase() === "python";
}

function stripTrailingComment(line: string) {
  if (/["']/.test(line)) {
    return line;
  }

  const hashIndex = line.indexOf("#");
  return hashIndex >= 0 ? line.slice(0, hashIndex) : line;
}

function indentLines(value: string, selectionStart: number, selectionEnd: number): EditorTextEdit {
  const lineStarts = getSelectedLineStarts(value, selectionStart, selectionEnd);
  let nextValue = value;

  for (const lineStart of [...lineStarts].reverse()) {
    nextValue = nextValue.slice(0, lineStart) + INDENT_UNIT + nextValue.slice(lineStart);
  }

  return {
    value: nextValue,
    selectionStart: selectionStart + INDENT_SIZE,
    selectionEnd: selectionEnd + INDENT_SIZE * lineStarts.length,
  };
}

function dedentLines(value: string, selectionStart: number, selectionEnd: number): EditorTextEdit {
  const lineStarts = getSelectedLineStarts(value, selectionStart, selectionEnd);
  let nextValue = value;
  let nextStart = selectionStart;
  let nextEnd = selectionEnd;

  for (const lineStart of [...lineStarts].reverse()) {
    const removeCount = countRemovableIndent(nextValue, lineStart);
    if (removeCount === 0) {
      continue;
    }

    nextValue = nextValue.slice(0, lineStart) + nextValue.slice(lineStart + removeCount);
    const shift = (position: number) =>
      position <= lineStart ? position : Math.max(lineStart, position - removeCount);
    nextStart = shift(nextStart);
    nextEnd = shift(nextEnd);
  }

  return { value: nextValue, selectionStart: nextStart, selectionEnd: nextEnd };
}

function insertNewlineWithIndent(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  language: string | null | undefined,
): EditorTextEdit {
  const lineStart = getLineStart(value, selectionStart);
  const lineBeforeCaret = value.slice(lineStart, selectionStart);
  let indent = lineBeforeCaret.match(/^[ \t]*/)?.[0] ?? "";

  if (isPython(language)) {
    const code = stripTrailingComment(lineBeforeCaret).trim();

    if (code.endsWith(":")) {
      indent += INDENT_UNIT;
    } else if (dedentKeywordPattern.test(code)) {
      indent = indent.endsWith("\t")
        ? indent.slice(0, -1)
        : indent.slice(0, Math.max(0, indent.length - INDENT_SIZE));
    }
  }

  const insertion = `\n${indent}`;
  const caret = selectionStart + insertion.length;

  return {
    value: value.slice(0, selectionStart) + insertion + value.slice(selectionEnd),
    selectionStart: caret,
    selectionEnd: caret,
  };
}

function deleteIndentBackward(value: string, selectionStart: number): EditorTextEdit | null {
  const lineStart = getLineStart(value, selectionStart);
  const beforeCaret = value.slice(lineStart, selectionStart);

  if (beforeCaret.length === 0 || !/^ +$/.test(beforeCaret)) {
    return null;
  }

  const removeCount = ((beforeCaret.length - 1) % INDENT_SIZE) + 1;
  const caret = selectionStart - removeCount;

  return {
    value: value.slice(0, caret) + value.slice(selectionStart),
    selectionStart: caret,
    selectionEnd: caret,
  };
}

/**
 * Applies Python-style indentation for Tab, Shift+Tab, Enter and Backspace.
 * Returns null when the browser's default behavior should be kept.
 */
export function applyEditorIndentKey(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  input: EditorIndentKeyInput,
): EditorTextEdit | null {
  const hasMultiLineSelection = value.slice(selectionStart, selectionEnd).includes("\n");

  switch (input.key) {
    case "Tab": {
      if (input.shiftKey) {
        return dedentLines(value, selectionStart, selectionEnd);
      }

      if (hasMultiLineSelection) {
        return indentLines(value, selectionStart, selectionEnd);
      }

      const column = selectionStart - getLineStart(value, selectionStart);
      const spaces = " ".repeat(INDENT_SIZE - (column % INDENT_SIZE));
      const caret = selectionStart + spaces.length;

      return {
        value: value.slice(0, selectionStart) + spaces + value.slice(selectionEnd),
        selectionStart: caret,
        selectionEnd: caret,
      };
    }
    case "Enter":
      return insertNewlineWithIndent(value, selectionStart, selectionEnd, input.language);
    case "Backspace":
      return selectionStart === selectionEnd
        ? deleteIndentBackward(value, selectionStart)
        : null;
    default:
      return null;
  }
}
