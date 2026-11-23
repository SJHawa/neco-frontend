import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { hashPassword, sha256Fallback } from "../../src/features/auth/hashPassword.ts";

const toHex = (bytes) => Buffer.from(bytes).toString("hex");
const nodeSha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");

test("sha256Fallback matches SHA-256 for empty, multi-block and unicode input", () => {
  for (const input of ["", "abc", "password123!", "a".repeat(55), "a".repeat(64), "x".repeat(1000), "비밀번호🐱"]) {
    assert.equal(toHex(sha256Fallback(new TextEncoder().encode(input))), nodeSha256(input), input);
  }
});

test("hashPassword falls back when crypto.subtle is unavailable", async (t) => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  Object.defineProperty(globalThis, "crypto", { value: undefined, configurable: true });
  t.after(() => Object.defineProperty(globalThis, "crypto", original));

  assert.equal(await hashPassword("qwer1234"), nodeSha256("qwer1234"));
});

test("hashPassword uses crypto.subtle when available", async () => {
  assert.equal(await hashPassword("qwer1234"), nodeSha256("qwer1234"));
});
