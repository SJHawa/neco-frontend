import test from "node:test";
import assert from "node:assert/strict";
import { AppError } from "../../src/shared/utils/appError.ts";
import {
  LOGIN_SUCCESS_REDIRECT_PATH,
  createLoginRequest,
  mapLoginError,
  submitLogin,
  validateLoginForm,
} from "../../src/features/auth/loginModel.ts";

test("validateLoginForm requires both login credentials", () => {
  assert.deepEqual(
    validateLoginForm({
      loginId: " ",
      password: "",
    }),
    {
      loginId: "Please enter your login ID.",
      password: "Please enter your password.",
    },
  );
});

test("createLoginRequest trims the login ID and forwards the password hash", () => {
  assert.deepEqual(
    createLoginRequest(
      {
        loginId: " relay-user ",
        password: "secret",
      },
      "hashed-password",
    ),
    {
      loginId: "relay-user",
      passwordHash: "hashed-password",
    },
  );
});

test("mapLoginError surfaces invalid credentials at the form level", () => {
  assert.deepEqual(
    mapLoginError(
      new AppError({
        code: "AUTH_INVALID_CREDENTIALS",
        message: "invalid credentials",
        status: 401,
      }),
    ),
    {
      fieldErrors: {},
      formError: "The login ID or password is invalid.",
    },
  );
});

test("submitLogin hashes the password and redirects successful logins to /main", async () => {
  const requests = [];

  const result = await submitLogin({
    values: {
      loginId: "relay-user",
      password: "secret",
    },
    login: async (request) => {
      requests.push(request);

      return {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        user: {
          userId: "user-1",
          loginId: request.loginId,
          nickname: "Relay Runner",
          email: null,
        },
      };
    },
  });

  assert.equal(result.redirectTo, LOGIN_SUCCESS_REDIRECT_PATH);
  assert.equal(result.response.user.userId, "user-1");
  assert.deepEqual(requests, [
    {
      loginId: "relay-user",
      passwordHash:
        "2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b",
    },
  ]);
});
