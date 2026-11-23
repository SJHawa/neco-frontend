import test from "node:test";
import assert from "node:assert/strict";
import { applyEditorIndentKey } from "../../src/features/editor/editorIndentation.ts";

const py = (key, extra = {}) => ({ key, language: "python", ...extra });

function at(value, marker = "|") {
  const index = value.indexOf(marker);
  return { value: value.replace(marker, ""), caret: index };
}

test("Tab inserts spaces up to the next 4-column stop", () => {
  const { value, caret } = at("|print(1)");
  assert.deepEqual(applyEditorIndentKey(value, caret, caret, py("Tab")), {
    value: "    print(1)",
    selectionStart: 4,
    selectionEnd: 4,
  });

  const aligned = at("  |x");
  assert.deepEqual(applyEditorIndentKey(aligned.value, aligned.caret, aligned.caret, py("Tab")), {
    value: "    x",
    selectionStart: 4,
    selectionEnd: 4,
  });
});

test("Tab and Shift+Tab indent and dedent every selected line", () => {
  const value = "a = 1\nb = 2\nc = 3";
  const indented = applyEditorIndentKey(value, 0, 11, py("Tab"));
  assert.deepEqual(indented, {
    value: "    a = 1\n    b = 2\nc = 3",
    selectionStart: 4,
    selectionEnd: 19,
  });

  const dedented = applyEditorIndentKey(
    indented.value,
    indented.selectionStart,
    indented.selectionEnd,
    py("Tab", { shiftKey: true }),
  );
  assert.deepEqual(dedented, { value, selectionStart: 0, selectionEnd: 11 });
});

test("Shift+Tab removes at most one indent level from the current line", () => {
  const { value, caret } = at("        ret|urn x");
  assert.deepEqual(applyEditorIndentKey(value, caret, caret, py("Tab", { shiftKey: true })), {
    value: "    return x",
    selectionStart: 7,
    selectionEnd: 7,
  });
});

test("Enter keeps the current indentation", () => {
  const { value, caret } = at("def main():\n    x = 1|");
  const edit = applyEditorIndentKey(value, caret, caret, py("Enter"));
  assert.equal(edit.value, "def main():\n    x = 1\n    ");
  assert.equal(edit.selectionStart, edit.value.length);
});

test("Enter after a colon adds one Python indent level, even with a comment", () => {
  const block = at("    if op == \"+\":|");
  assert.equal(
    applyEditorIndentKey(block.value, block.caret, block.caret, py("Enter")).value,
    "    if op == \"+\":\n        ",
  );

  const commented = at("for i in range(3):  # loop|");
  assert.equal(
    applyEditorIndentKey(commented.value, commented.caret, commented.caret, py("Enter")).value,
    "for i in range(3):  # loop\n    ",
  );
});

test("Enter after return/pass/break dedents one level", () => {
  const { value, caret } = at("        return|");
  assert.equal(
    applyEditorIndentKey(value, caret, caret, py("Enter")).value,
    "        return\n    ",
  );
});

test("Enter does not add colon indentation for non-Python files", () => {
  const { value, caret } = at("  - item:|");
  assert.equal(
    applyEditorIndentKey(value, caret, caret, { key: "Enter", language: "markdown" }).value,
    "  - item:\n  ",
  );
});

test("Backspace inside leading spaces deletes back to the previous indent stop", () => {
  const { value, caret } = at("        |");
  assert.deepEqual(applyEditorIndentKey(value, caret, caret, py("Backspace")), {
    value: "    ",
    selectionStart: 4,
    selectionEnd: 4,
  });

  const partial = at("      |");
  assert.equal(
    applyEditorIndentKey(partial.value, partial.caret, partial.caret, py("Backspace")).value,
    "    ",
  );
});

test("Backspace after code and other keys keep the browser default", () => {
  const { value, caret } = at("    x|");
  assert.equal(applyEditorIndentKey(value, caret, caret, py("Backspace")), null);
  assert.equal(applyEditorIndentKey("abc", 0, 2, py("Backspace")), null);
  assert.equal(applyEditorIndentKey("abc", 1, 1, py("a")), null);
});
