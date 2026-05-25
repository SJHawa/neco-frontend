import test from "node:test";
import assert from "node:assert/strict";
import { createAppStore, resetAppStoreForLogout } from "../../src/app/store/clientState.ts";
import { resolveCurrentGameRoomState } from "../../src/features/game-room/currentRoom.ts";
import { createGameRoomApi } from "../../src/features/game-room/gameRoomApi.ts";
import { createInvitationApi } from "../../src/features/invitation/invitationApi.ts";
import {
  deriveMainPageInitializationView,
  loadCurrentRoomState,
  loadInvitations,
} from "../../src/pages/MainPage/mainInitialization.ts";
import { AppError } from "../../src/shared/utils/appError.ts";

function createRoom(overrides = {}) {
  return {
    gameRoomId: "room-1",
    title: "릴레이 방",
    status: "WAITING",
    ownerUserId: "owner-1",
    myRole: "OWNER",
    myMembershipStatus: "JOINED",
    joinedParticipantCount: 1,
    minParticipants: 2,
    maxParticipants: 4,
    createdAt: "2026-05-25T10:00:00Z",
    updatedAt: "2026-05-25T10:05:00Z",
    ...overrides,
  };
}

function createInvitation(overrides = {}) {
  return {
    participantId: "participant-1",
    gameRoomId: "room-1",
    gameRoomTitle: "릴레이 방",
    userId: "user-1",
    nickname: "현하",
    role: "OWNER",
    status: "INVITED",
    roomStatus: "WAITING",
    createdAt: "2026-05-25T10:06:00Z",
    ...overrides,
  };
}

test("resolveCurrentGameRoomState returns no room when the server returns an empty list", () => {
  assert.deepEqual(resolveCurrentGameRoomState([]), {
    currentRoom: null,
    duplicateRoomWarning: false,
  });
});

test("resolveCurrentGameRoomState returns the only room without a duplicate warning", () => {
  const room = createRoom();

  assert.deepEqual(resolveCurrentGameRoomState([room]), {
    currentRoom: room,
    duplicateRoomWarning: false,
  });
});

test("resolveCurrentGameRoomState prefers the most recently updated room and raises a warning for duplicate rooms", () => {
  const olderRoom = createRoom({
    gameRoomId: "room-older",
    updatedAt: "2026-05-25T10:00:00Z",
  });
  const newerRoom = createRoom({
    gameRoomId: "room-newer",
    updatedAt: "2026-05-25T10:09:00Z",
  });

  let warnedRooms = [];

  const result = resolveCurrentGameRoomState([olderRoom, newerRoom], {
    onDuplicateRoomsDetected(rooms) {
      warnedRooms = rooms;
    },
  });

  assert.equal(result.currentRoom?.gameRoomId, "room-newer");
  assert.equal(result.duplicateRoomWarning, true);
  assert.deepEqual(
    warnedRooms.map((room) => room.gameRoomId),
    ["room-newer", "room-older"],
  );
});

test("createGameRoomApi requests the current-room query by user ID", async () => {
  const calls = [];
  const api = createGameRoomApi({
    async get(path, options) {
      calls.push({ path, options });
      return [createRoom()];
    },
    async post() {
      throw new Error("startGame should not be called in this test");
    },
  });

  const result = await api.getCurrentRooms("user 1");

  assert.equal(result.length, 1);
  assert.deepEqual(calls, [
    {
      path: "/game-rooms?userId=user%201",
      options: undefined,
    },
  ]);
});

test("createGameRoomApi posts the start-game request with the allowed empty request shape", async () => {
  const calls = [];
  const api = createGameRoomApi({
    async get() {
      throw new Error("getCurrentRooms should not be called in this test");
    },
    async post(path, body, options) {
      calls.push({ path, body, options });
      return { success: true };
    },
  });

  const result = await api.startGame("room 1");

  assert.deepEqual(result, { success: true });
  assert.deepEqual(calls, [
    {
      path: "/game-rooms/room%201/start",
      body: {},
      options: undefined,
    },
  ]);
});

test("createInvitationApi requests only invited participants for the signed-in user", async () => {
  const calls = [];
  const api = createInvitationApi({
    async get(path, options) {
      calls.push({ path, options });
      return [createInvitation()];
    },
  });

  const result = await api.getInvitedParticipants("user 1");

  assert.equal(result.length, 1);
  assert.deepEqual(calls, [
    {
      path: "/game-room-participants?userId=user%201&status=INVITED",
      options: undefined,
    },
  ]);
});

test("loadCurrentRoomState hydrates the resolved single-room policy", async () => {
  const room = createRoom();

  const result = await loadCurrentRoomState({
    userId: "user-1",
    async getCurrentRooms(userId) {
      assert.equal(userId, "user-1");
      return [room];
    },
  });

  assert.deepEqual(result, {
    currentRoom: room,
    duplicateRoomWarning: false,
  });
});

test("loadInvitations hydrates invited participants for the signed-in user", async () => {
  const invitation = createInvitation();

  const result = await loadInvitations({
    userId: "user-1",
    async getInvitedParticipants(userId) {
      assert.equal(userId, "user-1");
      return [invitation];
    },
  });

  assert.deepEqual(result, [invitation]);
});

test("deriveMainPageInitializationView returns a loading state while both queries are unresolved", () => {
  const view = deriveMainPageInitializationView({
    currentRoomQuery: {
      data: undefined,
      error: null,
      isPending: true,
    },
    invitationQuery: {
      data: undefined,
      error: null,
      isPending: true,
    },
  });

  assert.equal(view.status, "loading");
  assert.equal(view.blockingErrorMessage, null);
});

test("deriveMainPageInitializationView returns the empty ready state when both queries succeed with no room and no invitations", () => {
  const view = deriveMainPageInitializationView({
    currentRoomQuery: {
      data: {
        currentRoom: null,
        duplicateRoomWarning: false,
      },
      error: null,
      isPending: false,
    },
    invitationQuery: {
      data: [],
      error: null,
      isPending: false,
    },
  });

  assert.equal(view.status, "ready");
  assert.equal(view.currentRoomState.currentRoom, null);
  assert.deepEqual(view.invitations, []);
  assert.equal(view.currentRoomErrorMessage, null);
  assert.equal(view.invitationErrorMessage, null);
});

test("deriveMainPageInitializationView keeps a successful current-room result visible when invitation loading fails", () => {
  const room = createRoom();

  const view = deriveMainPageInitializationView({
    currentRoomQuery: {
      data: {
        currentRoom: room,
        duplicateRoomWarning: false,
      },
      error: null,
      isPending: false,
    },
    invitationQuery: {
      data: undefined,
      error: new AppError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Invitation query failed",
        status: 500,
      }),
      isPending: false,
    },
  });

  assert.equal(view.status, "ready");
  assert.equal(view.currentRoomState.currentRoom?.gameRoomId, "room-1");
  assert.equal(view.invitationErrorMessage, "A server error occurred.");
});

test("deriveMainPageInitializationView returns a retryable blocking error when neither query has usable data", () => {
  const view = deriveMainPageInitializationView({
    currentRoomQuery: {
      data: undefined,
      error: new AppError({
        code: "ROOM_NOT_FOUND",
        message: "No room",
        status: 404,
      }),
      isPending: false,
    },
    invitationQuery: {
      data: undefined,
      error: null,
      isPending: false,
    },
  });

  assert.equal(view.status, "error");
  assert.equal(view.blockingErrorMessage, "The room was not found.");
});

test("resetAppStoreForLogout clears room initialization data alongside auth state", () => {
  const store = createAppStore();

  store.setState((state) => ({
    ...state,
    auth: {
      user: {
        userId: "user-1",
        loginId: "relay-user",
        nickname: "현하",
        email: null,
      },
      accessToken: "access-token",
      refreshToken: "refresh-token",
      isAuthenticated: true,
    },
    room: {
      currentRoom: createRoom(),
      duplicateRoomWarning: true,
      invitations: [createInvitation()],
      roomWaitingState: null,
    },
  }));

  resetAppStoreForLogout(store);

  const nextState = store.getState();

  assert.equal(nextState.auth.isAuthenticated, false);
  assert.equal(nextState.room.currentRoom, null);
  assert.equal(nextState.room.duplicateRoomWarning, false);
  assert.deepEqual(nextState.room.invitations, []);
});
