import { mergeCurrentRoomFromGameState } from "../realtime/realtimeEventReducers";
import type { RootClientState } from "../../shared/types/clientState";
import type {
  CurrentGameRoom,
  GameRoomParticipant,
  GameState,
  MembershipStatus,
  MissionState,
  ParticipantRole,
  RoomWaitingParticipant,
  RoomWaitingState,
} from "../../shared/types/domain";

export type RealtimeWaitingRoomSnapshot = {
  gameState: GameState;
  missionState: MissionState | null;
};

type BuildRoomWaitingStateOptions = {
  currentRoom: CurrentGameRoom;
  participants: GameRoomParticipant[];
  previousState?: RoomWaitingState | null;
  currentUser: {
    userId: string;
    nickname: string;
  };
  realtimeSnapshot?: RealtimeWaitingRoomSnapshot | null;
};

export function getRealtimeWaitingRoomSnapshot(
  state: {
    game: Pick<RootClientState["game"], "gameState" | "missionState">;
    realtime: Pick<RootClientState["realtime"], "activeRoomId">;
  },
  gameRoomId: string,
): RealtimeWaitingRoomSnapshot | null {
  if (state.realtime.activeRoomId !== gameRoomId || !state.game.gameState) {
    return null;
  }

  return {
    gameState: state.game.gameState,
    missionState: state.game.missionState,
  };
}

export function resolveWaitingRoomCurrentRoom({
  httpRoom,
  storeCurrentRoom,
  realtimeSnapshot,
  participants,
}: {
  httpRoom: CurrentGameRoom;
  storeCurrentRoom: CurrentGameRoom | null;
  realtimeSnapshot: RealtimeWaitingRoomSnapshot | null;
  participants: RoomWaitingParticipant[];
}): CurrentGameRoom {
  if (
    storeCurrentRoom?.gameRoomId === httpRoom.gameRoomId &&
    realtimeSnapshot &&
    storeCurrentRoom.status === realtimeSnapshot.gameState.status
  ) {
    return storeCurrentRoom;
  }

  if (realtimeSnapshot) {
    return mergeCurrentRoomFromGameState(
      httpRoom,
      realtimeSnapshot.gameState,
      participants,
    );
  }

  return httpRoom;
}

function buildFallbackParticipant({
  currentRoom,
  currentUser,
}: Pick<BuildRoomWaitingStateOptions, "currentRoom" | "currentUser">): RoomWaitingParticipant {
  return {
    userId: currentUser.userId,
    nickname: currentUser.nickname,
    role: currentRoom.myRole,
    membershipStatus: currentRoom.myMembershipStatus,
  };
}

function mapParticipants(
  participants: GameRoomParticipant[],
  fallbackParticipant: RoomWaitingParticipant,
) {
  if (participants.length === 0) {
    return [fallbackParticipant];
  }

  return participants.map((participant) => ({
    userId: participant.userId,
    nickname: participant.nickname,
    role: participant.role,
    membershipStatus: participant.membershipStatus,
  }));
}

function buildWaitingGameState(currentRoom: CurrentGameRoom): GameState {
  return {
    status: currentRoom.status,
    difficulty: currentRoom.difficulty,
    timeLimitSeconds: currentRoom.timeLimitSeconds,
    maxStrikeCount: currentRoom.maxStrikeCount,
    minParticipants: currentRoom.minParticipants,
    maxParticipants: currentRoom.maxParticipants,
  };
}

type RoomGameStateMetadata = Pick<
  GameState,
  | "status"
  | "difficulty"
  | "timeLimitSeconds"
  | "maxStrikeCount"
  | "minParticipants"
  | "maxParticipants"
>;

function getRoomGameStateMetadata(room: CurrentGameRoom): RoomGameStateMetadata {
  return {
    status: room.status,
    difficulty: room.difficulty,
    timeLimitSeconds: room.timeLimitSeconds,
    maxStrikeCount: room.maxStrikeCount,
    minParticipants: room.minParticipants,
    maxParticipants: room.maxParticipants,
  };
}

function hasRoomGameStateMetadataChanged(
  previousRoom: CurrentGameRoom,
  currentRoom: CurrentGameRoom,
) {
  const previousMetadata = getRoomGameStateMetadata(previousRoom);
  const currentMetadata = getRoomGameStateMetadata(currentRoom);

  return (
    previousMetadata.status !== currentMetadata.status ||
    previousMetadata.difficulty !== currentMetadata.difficulty ||
    previousMetadata.timeLimitSeconds !== currentMetadata.timeLimitSeconds ||
    previousMetadata.maxStrikeCount !== currentMetadata.maxStrikeCount ||
    previousMetadata.minParticipants !== currentMetadata.minParticipants ||
    previousMetadata.maxParticipants !== currentMetadata.maxParticipants
  );
}

function findChangedParticipant({
  participants,
  previousParticipants,
  currentUserId,
}: {
  participants: RoomWaitingParticipant[];
  previousParticipants: RoomWaitingParticipant[];
  currentUserId: string;
}) {
  if (participants.length === 0) {
    return null;
  }

  const previousByUserId = new Map(
    previousParticipants.map((participant) => [participant.userId, participant]),
  );
  const changedParticipants = participants.filter((participant) => {
    const previousParticipant = previousByUserId.get(participant.userId);

    return (
      !previousParticipant ||
      previousParticipant.membershipStatus !== participant.membershipStatus ||
      previousParticipant.role !== participant.role ||
      previousParticipant.nickname !== participant.nickname
    );
  });

  if (changedParticipants.length === 0) {
    return null;
  }

  return (
    changedParticipants.find((participant) => participant.userId === currentUserId) ??
    changedParticipants[0]
  );
}

export function buildRoomWaitingState({
  currentRoom,
  participants,
  previousState = null,
  currentUser,
  realtimeSnapshot = null,
}: BuildRoomWaitingStateOptions): RoomWaitingState {
  const fallbackParticipant = buildFallbackParticipant({
    currentRoom,
    currentUser,
  });
  const nextParticipants = mapParticipants(participants, fallbackParticipant);
  const joinedParticipantCount = nextParticipants.filter(
    (participant) => participant.membershipStatus === "JOINED",
  ).length;
  const isSameRoom =
    previousState?.currentRoom.gameRoomId === currentRoom.gameRoomId;
  const resolvedCurrentRoom = realtimeSnapshot
    ? mergeCurrentRoomFromGameState(
        currentRoom,
        realtimeSnapshot.gameState,
        nextParticipants,
      )
    : {
        ...currentRoom,
        joinedParticipantCount:
          joinedParticipantCount > 0
            ? joinedParticipantCount
            : currentRoom.joinedParticipantCount,
      };

  return {
    currentRoom: resolvedCurrentRoom,
    participants: nextParticipants,
    changedParticipant:
      previousState?.currentRoom.gameRoomId === currentRoom.gameRoomId
        ? findChangedParticipant({
            participants: nextParticipants,
            previousParticipants: previousState.participants,
            currentUserId: currentUser.userId,
          })
        : null,
    gameState: realtimeSnapshot
      ? realtimeSnapshot.gameState
      : isSameRoom &&
          previousState &&
          !hasRoomGameStateMetadataChanged(previousState.currentRoom, currentRoom)
        ? previousState.gameState
        : buildWaitingGameState(currentRoom),
    missionState: realtimeSnapshot
      ? realtimeSnapshot.missionState
      : isSameRoom && previousState
        ? previousState.missionState
        : null,
  };
}

export function getWaitingRoomStartButtonState(currentRoom: CurrentGameRoom) {
  const canShowStartButton =
    currentRoom.myRole === "OWNER" && currentRoom.status === "WAITING";
  const canClickStartButton =
    canShowStartButton &&
    currentRoom.joinedParticipantCount >= currentRoom.minParticipants;

  return {
    canShowStartButton,
    canClickStartButton,
  };
}

function isSameParticipant(
  left: RoomWaitingParticipant | null | undefined,
  right: RoomWaitingParticipant | null | undefined,
) {
  return (
    left?.userId === right?.userId &&
    left?.nickname === right?.nickname &&
    left?.role === right?.role &&
    left?.membershipStatus === right?.membershipStatus
  );
}

function isSameParticipantList(
  left: RoomWaitingParticipant[],
  right: RoomWaitingParticipant[],
) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((participant, index) =>
    isSameParticipant(participant, right[index]),
  );
}

function isSameCurrentRoom(
  left: CurrentGameRoom,
  right: CurrentGameRoom,
) {
  return (
    left.gameRoomId === right.gameRoomId &&
    left.status === right.status &&
    left.difficulty === right.difficulty &&
    left.ownerUserId === right.ownerUserId &&
    left.myRole === right.myRole &&
    left.myMembershipStatus === right.myMembershipStatus &&
    left.joinedParticipantCount === right.joinedParticipantCount &&
    left.timeLimitSeconds === right.timeLimitSeconds &&
    left.maxStrikeCount === right.maxStrikeCount &&
    left.minParticipants === right.minParticipants &&
    left.maxParticipants === right.maxParticipants &&
    left.createdAt === right.createdAt &&
    left.updatedAt === right.updatedAt
  );
}

function isSameGameState(
  left: GameState,
  right: GameState,
) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isSameMissionState(
  left: MissionState | null,
  right: MissionState | null,
) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function isSameRoomWaitingState(
  left: RoomWaitingState | null | undefined,
  right: RoomWaitingState | null | undefined,
) {
  if (!left || !right) {
    return left === right;
  }

  return (
    isSameCurrentRoom(left.currentRoom, right.currentRoom) &&
    isSameParticipantList(left.participants, right.participants) &&
    isSameParticipant(left.changedParticipant, right.changedParticipant) &&
    isSameGameState(left.gameState, right.gameState) &&
    isSameMissionState(left.missionState, right.missionState)
  );
}

export function getMembershipStatusLabel(status: MembershipStatus) {
  switch (status) {
    case "INVITED":
      return "초대됨";
    case "JOINED":
      return "참여중";
    case "LEFT":
      return "이탈";
    case "DENIED":
      return "거절됨";
    default:
      return status;
  }
}

export function getParticipantRoleLabel(role: ParticipantRole) {
  return role === "OWNER" ? "방장" : "참가자";
}

export function buildParticipantChangeSummary(participant: RoomWaitingParticipant | null) {
  if (!participant) {
    return null;
  }

  switch (participant.membershipStatus) {
    case "INVITED":
      return `${participant.nickname}님을 초대했어요.`;
    case "JOINED":
      return `${participant.nickname}님이 대기방에 참여했어요.`;
    case "LEFT":
      return `${participant.nickname}님이 대기방에서 나갔어요.`;
    case "DENIED":
      return `${participant.nickname}님이 초대를 거절했어요.`;
    default:
      return `${participant.nickname}님의 참가 상태가 업데이트됐어요.`;
  }
}
