import type { CodeSnapshot, MissionState } from "../../shared/types/domain";

export function buildTurnCodeSnapshot(
  editorFiles: Record<string, string>,
  missionState: MissionState | null,
): CodeSnapshot {
  const projectFiles = missionState?.projectStructure?.files ?? [];
  const filePaths =
    projectFiles.length > 0
      ? projectFiles.map((file) => file.filePath)
      : Object.keys(editorFiles);

  return {
    files: filePaths.map((filePath) => ({
      filePath,
      content: editorFiles[filePath] ?? "",
    })),
  };
}
