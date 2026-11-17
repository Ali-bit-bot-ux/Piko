import { describe, expect, it } from "vitest";
import { mailtoLink, whatsappLink, whatsappNumber } from "./report-share";

describe("whatsappNumber", () => {
  it("keeps digits only, no plus", () => {
    expect(whatsappNumber("+7 (700) 123-45-67")).toBe("77001234567");
  });

  it("turns a leading 8 of a Kazakhstan number into 7", () => {
    expect(whatsappNumber("8 700 123 45 67")).toBe("77001234567");
  });

  it("is null for e-mail and text", () => {
    expect(whatsappNumber("parent@example.invalid")).toBeNull();
    expect(whatsappNumber("позвоните маме")).toBeNull();
  });
});

describe("whatsappLink", () => {
  it("points to the number and encodes the text", () => {
    expect(whatsappLink("+7 700 123 45 67", "Привет & ссылка")).toBe(
      `https://wa.me/77001234567?text=${encodeURIComponent("Привет & ссылка")}`,
    );
  });

  it("opens the contact picker when there is no phone", () => {
    expect(whatsappLink("parent@example.invalid", "x")).toBe(
      "https://wa.me/?text=x",
    );
  });
});

describe("mailtoLink", () => {
  it("builds a mailto link with subject and body", () => {
    expect(mailtoLink("parent@example.invalid", "Тема", "a b")).toBe(
      `mailto:parent@example.invalid?subject=${encodeURIComponent("Тема")}&body=a%20b`,
    );
  });

  it("is null when the contact is not an e-mail", () => {
    expect(mailtoLink("+7 700 123 45 67", "s", "b")).toBeNull();
  });
});
