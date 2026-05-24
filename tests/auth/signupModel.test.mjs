import test from "node:test";
import assert from "node:assert/strict";
import { AppError } from "../../src/shared/utils/appError.ts";
import {
  SIGNUP_SUCCESS_REDIRECT_PATH,
  createSignupRequest,
  getNicknameAvailabilityMessage,
  mapSignupError,
  submitSignup,
  validateSignupForm,
} from "../../src/features/auth/signupModel.ts";

test("validateSignupForm requires login ID, nickname, and password", () => {
  assert.deepEqual(
    validateSignupForm({
      loginId: " ",
      nickname: "",
      email: "not-an-email",
      password: "",
    }),
    {
      loginId: "Please enter a login ID.",
      nickname: "Please enter a nickname.",
      email: "Please enter a valid email address.",
      password: "Please enter a password.",
    },
  );
});

test("createSignupRequest trims fields and normalizes an empty email to null", () => {
  assert.deepEqual(
    createSignupRequest(
      {
        loginId: " relay-user ",
        nickname: " Relay Runner ",
        email: " ",
        password: "secret",
      },
      "hashed-password",
    ),
    {
      loginId: "relay-user",
      nickname: "Relay Runner",
      passwordHash: "hashed-password",
      email: null,
    },
  );
});

test("mapSignupError sends auth conflicts to the matching field", () => {
  const error = new AppError({
    code: "AUTH_NICKNAME_CONFLICT",
    message: "nickname already exists",
    status: 409,
  });

  assert.deepEqual(mapSignupError(error), {
    fieldErrors: {
      nickname: "This nickname is already in use.",
    },
    formError: null,
  });
});

test("getNicknameAvailabilityMessage mirrors the shared conflict copy", () => {
  assert.equal(
    getNicknameAvailabilityMessage(false),
    "This nickname is already in use.",
  );
  assert.equal(
    getNicknameAvailabilityMessage(true),
    "This nickname is available.",
  );
});

test("submitSignup hashes the password, calls signup, and routes back to login", async () => {
  const requests = [];

  const result = await submitSignup({
    values: {
      loginId: "relay-user",
      nickname: "Relay Runner",
      email: "runner@example.com",
      password: "secret",
    },
    signup: async (request) => {
      requests.push(request);

      return {
        userId: "user-1",
        loginId: request.loginId,
        nickname: request.nickname,
        email: request.email ?? null,
        createdAt: "2026-05-25T00:00:00Z",
      };
    },
  });

  assert.equal(result.redirectTo, SIGNUP_SUCCESS_REDIRECT_PATH);
  assert.equal(result.response.userId, "user-1");
  assert.deepEqual(requests, [
    {
      loginId: "relay-user",
      nickname: "Relay Runner",
      passwordHash:
        "2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b",
      email: "runner@example.com",
    },
  ]);
});
