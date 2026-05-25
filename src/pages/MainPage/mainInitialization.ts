import { getUserFacingErrorMessage } from "../../shared/utils/appError";
import { resolveCurrentGameRoomState } from "../../features/game-room/currentRoom";
import type { CurrentGameRoom, CurrentGameRoomState, GameRoomParticipant } from "../../shared/types/domain";

type MainInitializationDependencies = {
  getCurrentRooms: (userId: string) => Promise<CurrentGameRoom[]>;
  getInvitedParticipants: (userId: string) => Promise<GameRoomParticipant[]>;
};

type LoadCurrentRoomStateOptions = {
  userId: string;
  getCurrentRooms: MainInitializationDependencies["getCurrentRooms"];
  onDuplicateRoomsDetected?: (rooms: CurrentGameRoom[]) => void;
};

type LoadInvitationsOptions = {
  userId: string;
  getInvitedParticipants: MainInitializationDependencies["getInvitedParticipants"];
};

type QuerySnapshot<T> = {
  data: T | undefined;
  error: unknown | null;
  isPending: boolean;
};

export type MainPageInitializationView = {
  status: "loading" | "ready" | "error";
  currentRoomState: CurrentGameRoomState;
  invitations: GameRoomParticipant[];
  blockingErrorMessage: string | null;
  currentRoomErrorMessage: string | null;
  invitationErrorMessage: string | null;
};

export async function loadCurrentRoomState({
  userId,
  getCurrentRooms,
  onDuplicateRoomsDetected,
}: LoadCurrentRoomStateOptions): Promise<CurrentGameRoomState> {
  const rooms = await getCurrentRooms(userId);

  return resolveCurrentGameRoomState(rooms, {
    onDuplicateRoomsDetected,
  });
}

export async function loadInvitations({
  userId,
  getInvitedParticipants,
}: LoadInvitationsOptions): Promise<GameRoomParticipant[]> {
  return getInvitedParticipants(userId);
}

export function deriveMainPageInitializationView({
  currentRoomQuery,
  invitationQuery,
}: {
  currentRoomQuery: QuerySnapshot<CurrentGameRoomState>;
  invitationQuery: QuerySnapshot<GameRoomParticipant[]>;
}): MainPageInitializationView {
  const hasCurrentRoomData = currentRoomQuery.data !== undefined;
  const hasInvitationData = invitationQuery.data !== undefined;

  if (!hasCurrentRoomData && !hasInvitationData) {
    if (currentRoomQuery.isPending || invitationQuery.isPending) {
      return {
        status: "loading",
        currentRoomState: {
          currentRoom: null,
          duplicateRoomWarning: false,
        },
        invitations: [],
        blockingErrorMessage: null,
        currentRoomErrorMessage: null,
        invitationErrorMessage: null,
      };
    }

    return {
      status: "error",
      currentRoomState: {
        currentRoom: null,
        duplicateRoomWarning: false,
      },
      invitations: [],
      blockingErrorMessage: getUserFacingErrorMessage(
        currentRoomQuery.error ?? invitationQuery.error,
      ),
      currentRoomErrorMessage: null,
      invitationErrorMessage: null,
    };
  }

  return {
    status: "ready",
    currentRoomState: currentRoomQuery.data ?? {
      currentRoom: null,
      duplicateRoomWarning: false,
    },
    invitations: invitationQuery.data ?? [],
    blockingErrorMessage: null,
    currentRoomErrorMessage:
      currentRoomQuery.error && !hasCurrentRoomData
        ? getUserFacingErrorMessage(currentRoomQuery.error)
        : null,
    invitationErrorMessage:
      invitationQuery.error && !hasInvitationData
        ? getUserFacingErrorMessage(invitationQuery.error)
        : null,
  };
}
