import test from "node:test";
import assert from "node:assert/strict";
import {
  AppError,
  getErrorMessageForCode,
  getUserFacingErrorMessage,
} from "../../src/shared/utils/appError.ts";

test("getErrorMessageForCode returns spec-defined messages", () => {
  assert.equal(
    getErrorMessageForCode("AUTH_TOKEN_EXPIRED"),
    "Your session has expired.",
  );
});

test("getUserFacingErrorMessage prefers mapped AppError codes", () => {
  const error = new AppError({
    code: "AUTH_INVALID_CREDENTIALS",
    message: "backend message",
    requestId: "req-1",
    status: 401,
  });

  assert.equal(
    getUserFacingErrorMessage(error),
    "The login ID or password is invalid.",
  );
});

test("getUserFacingErrorMessage falls back to raw messages for unknown errors", () => {
  assert.equal(
    getUserFacingErrorMessage(new Error("Plain failure")),
    "Plain failure",
  );
});
