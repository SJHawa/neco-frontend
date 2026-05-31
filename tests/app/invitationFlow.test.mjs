import test from "node:test";
import assert from "node:assert/strict";
import {
  buildInvitationAcceptMessage,
  buildInvitationDenyMessage,
  isRetryableInvitationActionError,
  resolveCompletedInvitationIds,
} from "../../src/features/invitation/invitationFlow.ts";
import { AppError } from "../../src/shared/utils/appError.ts";

function createInvitation(overrides = {}) {
  return {
    participantId: "participant-1",
    gameRoomId: "room-1",
    userId: "owner-1",
    nickname: "방장",
    role: "OWNER",
    membershipStatus: "INVITED",
    roomStatus: "WAITING",
    createdAt: "2026-05-25T10:06:00Z",
    ...overrides,
  };
}

function createResponse(overrides = {}) {
  return {
    aiChatRequestId: "request-1",
    requestType: "ROOM_JOIN",
    requestStatus: "COMPLETED",
    commandResult: {
      commandType: "ROOM_JOIN",
      status: "SUCCESS",
      apiPath: "/v1/game-room-participants/participant-1/join",
      gameRoomId: "room-1",
      participants: ["방장", "플레이어"],
      started: false,
    },
    ...overrides,
  };
}

test("buildInvitationAcceptMessage creates a neutral acceptance message", () => {
  assert.equal(buildInvitationAcceptMessage(createInvitation()), "게임방 초대를 수락할게요.");
});

test("buildInvitationDenyMessage creates a neutral denial message", () => {
  assert.equal(buildInvitationDenyMessage(createInvitation()), "게임방 초대는 거절할게요.");
});

test("resolveCompletedInvitationIds removes the joined invitation by participant ID from apiPath", () => {
  const invitations = [
    createInvitation(),
    createInvitation({
      participantId: "participant-2",
      gameRoomId: "room-2",
      nickname: "다른 방장",
    }),
  ];

  assert.deepEqual(
    resolveCompletedInvitationIds({
      invitations,
      response: createResponse(),
    }),
    ["participant-1"],
  );
});

test("resolveCompletedInvitationIds falls back to gameRoomId when apiPath is missing", () => {
  const invitations = [
    createInvitation(),
    createInvitation({
      participantId: "participant-2",
      gameRoomId: "room-2",
      nickname: "다른 방장",
    }),
  ];

  assert.deepEqual(
    resolveCompletedInvitationIds({
      invitations,
      response: createResponse({
        requestType: "USER_INVITE_DENY",
        commandResult: {
          commandType: "USER_INVITE_DENY",
          status: "SUCCESS",
          apiPath: null,
          gameRoomId: "room-2",
          participants: null,
          started: false,
        },
      }),
    }),
    ["participant-2"],
  );
});

test("resolveCompletedInvitationIds ignores unsuccessful command results", () => {
  assert.deepEqual(
    resolveCompletedInvitationIds({
      invitations: [createInvitation()],
      response: createResponse({
        commandResult: {
          commandType: "ROOM_JOIN",
          status: "FAILED",
          apiPath: "/v1/game-room-participants/participant-1/join",
          gameRoomId: "room-1",
          participants: null,
          started: false,
        },
      }),
    }),
    [],
  );
});

test("isRetryableInvitationActionError returns false for terminal invitation errors", () => {
  assert.equal(
    isRetryableInvitationActionError(
      new AppError({
        code: "INVITATION_ALREADY_PROCESSED",
        message: "Already handled",
        status: 409,
      }),
    ),
    false,
  );
});

test("isRetryableInvitationActionError keeps network or unknown failures retryable", () => {
  assert.equal(isRetryableInvitationActionError(new Error("Network down")), true);
});
