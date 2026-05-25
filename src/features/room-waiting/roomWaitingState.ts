import type {
  CurrentGameRoom,
  GameRoomParticipant,
  MembershipStatus,
  ParticipantRole,
  RoomWaitingParticipant,
  RoomWaitingState,
} from "../../shared/types/domain";

type BuildRoomWaitingStateOptions = {
  currentRoom: CurrentGameRoom;
  participants: GameRoomParticipant[];
  previousState?: RoomWaitingState | null;
  currentUser: {
    userId: string;
    nickname: string;
  };
};

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
    membershipStatus: participant.status,
  }));
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
}: BuildRoomWaitingStateOptions): RoomWaitingState {
  const fallbackParticipant = buildFallbackParticipant({
    currentRoom,
    currentUser,
  });
  const nextParticipants = mapParticipants(participants, fallbackParticipant);

  return {
    currentRoom,
    participants: nextParticipants,
    changedParticipant:
      previousState?.currentRoom.gameRoomId === currentRoom.gameRoomId
        ? findChangedParticipant({
            participants: nextParticipants,
            previousParticipants: previousState.participants,
            currentUserId: currentUser.userId,
          })
        : null,
  };
}

export function getWaitingRoomStartButtonState(currentRoom: CurrentGameRoom) {
  const canShowStartButton = currentRoom.myRole === "OWNER";
  const canClickStartButton =
    canShowStartButton &&
    currentRoom.status === "WAITING" &&
    currentRoom.joinedParticipantCount >= currentRoom.minParticipants;

  return {
    canShowStartButton,
    canClickStartButton,
  };
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
