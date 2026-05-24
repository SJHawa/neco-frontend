function toHexString(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
}

export async function hashPassword(password: string) {
  const subtleCrypto = globalThis.crypto?.subtle;

  if (!subtleCrypto) {
    throw new Error("Secure password hashing is unavailable in this environment.");
  }

  const encodedPassword = new TextEncoder().encode(password);
  const digest = await subtleCrypto.digest("SHA-256", encodedPassword);

  return toHexString(digest);
}
