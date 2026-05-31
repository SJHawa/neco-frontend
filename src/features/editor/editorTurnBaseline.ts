import type { EditorClientState } from "../../shared/types/clientState";

export function captureAuthoritativeSnapshot(
  authoritativeFiles: Record<string, string>,
) {
  return { ...authoritativeFiles };
}

/** Drops dirty local buffers; unknown paths fall back to empty content. */
export function convergeWorkingFilesToAuthoritative(
  editor: EditorClientState,
) {
  const paths = new Set([
    ...Object.keys(editor.files),
    ...Object.keys(editor.authoritativeFiles),
  ]);

  return Object.fromEntries(
    [...paths].map((filePath) => [
      filePath,
      editor.authoritativeFiles[filePath] ?? "",
    ]),
  );
}

/** Records a new turn without copying dirty local `editor.files` into the baseline. */
export function onEditorTurnIdChanged(
  editor: EditorClientState,
  turnId: string | undefined | null,
): EditorClientState {
  if (!turnId || editor.turnBaselineTurnId === turnId) {
    return editor;
  }

  const authoritativeSnapshot = captureAuthoritativeSnapshot(
    editor.authoritativeFiles,
  );

  return {
    ...editor,
    turnBaselineTurnId: turnId,
    turnBaselineFiles: authoritativeSnapshot,
    turnBaselineReady: Object.keys(authoritativeSnapshot).length > 0,
    files: convergeWorkingFilesToAuthoritative(editor),
  };
}

/**
 * Merges server-authoritative file content. Updates working `files` for synced paths.
 * Seeds the current turn baseline from authoritative content when the turn had no baseline yet.
 */
export function applyAuthoritativeEditorFiles(
  editor: EditorClientState,
  incoming: Record<string, string>,
  activeTurnId: string | undefined | null,
): EditorClientState {
  if (Object.keys(incoming).length === 0) {
    return editor;
  }

  const authoritativeFiles = { ...editor.authoritativeFiles, ...incoming };
  let next: EditorClientState = {
    ...editor,
    authoritativeFiles,
    files: {
      ...editor.files,
      ...incoming,
    },
  };

  if (
    !activeTurnId ||
    next.turnBaselineTurnId !== activeTurnId ||
    next.turnBaselineReady
  ) {
    return next;
  }

  return {
    ...next,
    turnBaselineFiles: captureAuthoritativeSnapshot(authoritativeFiles),
    turnBaselineReady: true,
  };
}

export function resolveEditorFileBaseline(
  filePath: string,
  editor: Pick<
    EditorClientState,
    "files" | "turnBaselineFiles" | "turnBaselineTurnId"
  >,
  activeTurnId: string | undefined,
) {
  if (
    activeTurnId &&
    editor.turnBaselineTurnId === activeTurnId &&
    Object.prototype.hasOwnProperty.call(editor.turnBaselineFiles, filePath)
  ) {
    return editor.turnBaselineFiles[filePath];
  }

  return editor.files[filePath] ?? "";
}

export function applyEditorFileReset(
  editor: EditorClientState,
  filePath: string,
  activeTurnId: string | undefined,
): EditorClientState {
  return {
    ...editor,
    files: {
      ...editor.files,
      [filePath]: resolveEditorFileBaseline(filePath, editor, activeTurnId),
    },
  };
}
