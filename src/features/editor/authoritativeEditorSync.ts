import type { EditorClientState } from "../../shared/types/clientState";
import type { CodeSnapshot, CodeUpdatedEvent } from "../../shared/types/domain";
import { applyAuthoritativeEditorFiles } from "./editorTurnBaseline";

export function isSameClientCodeUpdatedEcho(
  socketId: string | null,
  eventSessionId: string | undefined,
) {
  return Boolean(
    socketId && eventSessionId && socketId === eventSessionId,
  );
}

/** Authoritative merge applies only when the reflected event includes optional `content`. */
export function extractAuthoritativeFilesFromCodeUpdated(
  event: CodeUpdatedEvent,
): Record<string, string> | null {
  if (typeof event.content !== "string") {
    return null;
  }

  return { [event.filePath]: event.content };
}

export function extractAuthoritativeFilesFromCodeSnapshot(
  snapshot: CodeSnapshot | null | undefined,
) {
  if (!snapshot?.files?.length) {
    return {};
  }

  return Object.fromEntries(
    snapshot.files.map((file) => [file.filePath, file.content]),
  );
}

export function applyAuthoritativeFilesToEditor(
  editor: EditorClientState,
  incoming: Record<string, string>,
  activeTurnId: string | undefined | null,
) {
  if (Object.keys(incoming).length === 0) {
    return editor;
  }

  return applyAuthoritativeEditorFiles(editor, incoming, activeTurnId);
}
