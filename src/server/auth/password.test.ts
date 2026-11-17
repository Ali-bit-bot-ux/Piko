import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("accepts the right password and rejects a wrong one", async () => {
    const hash = await hashPassword("correct horse");
    expect(await verifyPassword("correct horse", hash)).toBe(true);
    expect(await verifyPassword("wrong horse", hash)).toBe(false);
  });

  it("uses a fresh salt, so equal passwords hash differently", async () => {
    const [a, b] = await Promise.all([
      hashPassword("same"),
      hashPassword("same"),
    ]);
    expect(a).not.toBe(b);
    expect(await verifyPassword("same", a)).toBe(true);
    expect(await verifyPassword("same", b)).toBe(true);
  });

  it("does not store the password in the hash", async () => {
    expect(await hashPassword("secret-value")).not.toContain("secret-value");
  });

  it.each([
    "",
    "plain-text",
    "bcrypt$x$y",
    "scrypt$0$8$1$c2FsdA==$aGFzaA==",
    "scrypt$16384$8$1$$",
    "scrypt$abc$8$1$c2FsdA==$aGFzaA==",
  ])("returns false for the malformed hash %j", async (stored) => {
    expect(await verifyPassword("anything", stored)).toBe(false);
  });
});
