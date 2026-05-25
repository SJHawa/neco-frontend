import type { AiChatSession } from "../../shared/types/domain";

function getSortableTimestamp(session: AiChatSession) {
  const updatedAt = Date.parse(session.updatedAt);

  if (!Number.isNaN(updatedAt)) {
    return updatedAt;
  }

  const createdAt = Date.parse(session.createdAt);

  return Number.isNaN(createdAt) ? 0 : createdAt;
}

export function selectActiveAiChatSession({
  sessions,
  currentRoomId,
}: {
  sessions: AiChatSession[];
  currentRoomId: string | null;
}) {
  const activeSessions = sessions.filter((session) => session.status === "ACTIVE");

  if (currentRoomId) {
    const [roomSession] = [...activeSessions]
      .filter((session) => session.gameRoomId === currentRoomId)
      .sort((left, right) => getSortableTimestamp(right) - getSortableTimestamp(left));

    if (roomSession) {
      return roomSession;
    }
  }

  const [mostRecentActiveSession] = [...activeSessions].sort(
    (left, right) => getSortableTimestamp(right) - getSortableTimestamp(left),
  );

  return mostRecentActiveSession ?? null;
}
