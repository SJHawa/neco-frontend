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
    gameRoomTitle: "문자열 핸들링 릴레이 방",
    userId: "owner-1",
    nickname: "방장",
    role: "OWNER",
    status: "INVITED",
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
      title: "문자열 핸들링 릴레이 방",
      participants: ["방장", "플레이어"],
      started: false,
    },
    ...overrides,
  };
}

test("buildInvitationAcceptMessage creates a natural-language acceptance message", () => {
  assert.equal(
    buildInvitationAcceptMessage(createInvitation()),
    "문자열 핸들링 릴레이 방 초대 수락할게요.",
  );
});

test("buildInvitationDenyMessage creates a natural-language denial message", () => {
  assert.equal(
    buildInvitationDenyMessage(createInvitation()),
    "문자열 핸들링 릴레이 방 초대는 거절할게요.",
  );
});

test("resolveCompletedInvitationIds removes the joined invitation by participant ID from apiPath", () => {
  const invitations = [
    createInvitation(),
    createInvitation({
      participantId: "participant-2",
      gameRoomId: "room-2",
      gameRoomTitle: "배열 릴레이 방",
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
      gameRoomTitle: "배열 릴레이 방",
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
          title: "배열 릴레이 방",
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
          title: "문자열 핸들링 릴레이 방",
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
