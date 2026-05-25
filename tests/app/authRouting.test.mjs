import test from "node:test";
import assert from "node:assert/strict";
import {
  getGuestRouteRedirectPath,
  getProtectedRouteRedirectPath,
  getRootRedirectPath,
} from "../../src/app/router/authRouting.ts";

test("getRootRedirectPath sends guests to login and members to main", () => {
  assert.equal(getRootRedirectPath(false), "/login");
  assert.equal(getRootRedirectPath(true), "/main");
});

test("getGuestRouteRedirectPath blocks authenticated users from guest-only routes", () => {
  assert.equal(getGuestRouteRedirectPath(false), null);
  assert.equal(getGuestRouteRedirectPath(true), "/main");
});

test("getProtectedRouteRedirectPath blocks guests from protected routes", () => {
  assert.equal(getProtectedRouteRedirectPath(false), "/login");
  assert.equal(getProtectedRouteRedirectPath(true), null);
});
