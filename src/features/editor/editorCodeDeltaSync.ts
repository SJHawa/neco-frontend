import type { EditorClientState } from "../../shared/types/clientState";
import type { CodeDelta } from "../../shared/types/domain";
import { applyTextRangeDelta, hasApplicableCodeDelta } from "./codeDelta";

export function applyCodeDeltaToEditor(
  editor: EditorClientState,
  filePath: string,
  codeDelta: CodeDelta,
): EditorClientState {
  if (!hasApplicableCodeDelta(codeDelta)) {
    return editor;
  }

  const currentContent =
    editor.files[filePath] ?? editor.authoritativeFiles[filePath] ?? "";
  const nextContent = applyTextRangeDelta(currentContent, codeDelta);

  if (nextContent === currentContent) {
    return editor;
  }

  return {
    ...editor,
    files: {
      ...editor.files,
      [filePath]: nextContent,
    },
  };
}
