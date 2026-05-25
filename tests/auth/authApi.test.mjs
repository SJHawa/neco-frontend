import test from "node:test";
import assert from "node:assert/strict";
import { createAuthApi } from "../../src/features/auth/authApi.ts";
import { AppError } from "../../src/shared/utils/appError.ts";

test("createAuthApi checks nickname availability without auth headers", async () => {
  const calls = [];
  const authApi = createAuthApi({
    async get(path, options) {
      calls.push({
        path,
        options,
      });

      return {
        isAvailable: true,
      };
    },
    async post() {
      throw new Error("post should not be called in nickname check test");
    },
  });

  const result = await authApi.checkNicknameAvailability("coding cat");

  assert.deepEqual(result, {
    isAvailable: true,
  });
  assert.deepEqual(calls, [
    {
      path: "/auth/check-nickname?nickname=coding%20cat",
      options: {
        authMode: "none",
      },
    },
  ]);
});

test("createAuthApi sends signup requests to the public auth endpoint", async () => {
  const calls = [];
  const authApi = createAuthApi({
    async get() {
      throw new Error("get should not be called in signup test");
    },
    async post(path, body, options) {
      calls.push({
        path,
        body,
        options,
      });

      return {
        userId: "user-1",
        loginId: "relay-user",
        nickname: "Relay Runner",
        email: null,
        createdAt: "2026-05-25T00:00:00Z",
      };
    },
  });

  const request = {
    loginId: "relay-user",
    nickname: "Relay Runner",
    passwordHash: "hashed",
    email: null,
  };

  const result = await authApi.signup(request);

  assert.equal(result.userId, "user-1");
  assert.deepEqual(calls, [
    {
      path: "/auth/signup",
      body: request,
      options: {
        authMode: "none",
      },
    },
  ]);
});

test("createAuthApi retries signup against the legacy register path when signup is missing", async () => {
  const calls = [];
  const authApi = createAuthApi({
    async get() {
      throw new Error("get should not be called in signup fallback test");
    },
    async post(path, body, options) {
      calls.push({
        path,
        body,
        options,
      });

      if (path === "/auth/signup") {
        throw new AppError({
          code: "HTTP_REQUEST_FAILED",
          message: "Not found",
          status: 404,
        });
      }

      return {
        userId: "user-2",
        loginId: "legacy-user",
        nickname: "Legacy Runner",
        email: null,
        createdAt: "2026-05-25T00:00:00Z",
      };
    },
  });

  const request = {
    loginId: "legacy-user",
    nickname: "Legacy Runner",
    passwordHash: "hashed",
    email: null,
  };

  const result = await authApi.signup(request);

  assert.equal(result.userId, "user-2");
  assert.deepEqual(calls, [
    {
      path: "/auth/signup",
      body: request,
      options: {
        authMode: "none",
      },
    },
    {
      path: "/auth/register",
      body: request,
      options: {
        authMode: "none",
      },
    },
  ]);
});

test("createAuthApi sends login requests to the public auth endpoint", async () => {
  const calls = [];
  const authApi = createAuthApi({
    async get() {
      throw new Error("get should not be called in login test");
    },
    async post(path, body, options) {
      calls.push({
        path,
        body,
        options,
      });

      return {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        user: {
          userId: "user-1",
          loginId: "relay-user",
          nickname: "Relay Runner",
          email: null,
        },
      };
    },
  });

  const request = {
    loginId: "relay-user",
    passwordHash: "hashed-password",
  };

  const result = await authApi.login(request);

  assert.equal(result.user.userId, "user-1");
  assert.deepEqual(calls, [
    {
      path: "/auth/login",
      body: request,
      options: {
        authMode: "none",
      },
    },
  ]);
});
