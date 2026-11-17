/**
 * Link for a parent contact: "mailto:" for an e-mail address, "tel:" for a
 * phone number (tap to call on a phone). Null when it is neither.
 */
export function contactHref(contact: string): string | null {
  const value = contact.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return `mailto:${value}`;
  }
  const digits = value.replace(/\D/g, "");
  if (
    digits.length >= 7 &&
    digits.length <= 15 &&
    /^\+?[\d\s().-]+$/.test(value)
  ) {
    return `tel:${value.startsWith("+") ? "+" : ""}${digits}`;
  }
  return null;
}
