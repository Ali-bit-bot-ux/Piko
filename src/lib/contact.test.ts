import { describe, expect, it } from "vitest";
import { contactHref } from "./contact";

describe("contactHref", () => {
  it("links an e-mail address", () => {
    expect(contactHref("parent@example.invalid")).toBe(
      "mailto:parent@example.invalid",
    );
    expect(contactHref("  parent@example.invalid ")).toBe(
      "mailto:parent@example.invalid",
    );
  });

  it("links a phone number and keeps only the digits and a leading plus", () => {
    expect(contactHref("+7 (700) 123-45-67")).toBe("tel:+77001234567");
    expect(contactHref("8 700 123 45 67")).toBe("tel:87001234567");
  });

  it("returns null for anything else", () => {
    expect(contactHref("")).toBeNull();
    expect(contactHref("позвоните маме")).toBeNull();
    expect(contactHref("12345")).toBeNull();
    expect(contactHref("javascript:alert(1)")).toBeNull();
  });
});
