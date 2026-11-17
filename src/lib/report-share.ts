import { contactHref } from "./contact";

/**
 * Phone number for wa.me: digits only, country code first, no plus.
 * A Kazakhstan number written as 8 700... becomes 7 700... Null when the
 * contact is not a phone number.
 */
export function whatsappNumber(contact: string): string | null {
  const href = contactHref(contact);
  if (!href?.startsWith("tel:")) return null;
  const digits = href.slice(4).replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8"))
    return `7${digits.slice(1)}`;
  return digits;
}

/** WhatsApp link with the message filled in. Without a phone the app asks whom to send to. */
export function whatsappLink(contact: string, text: string): string {
  const number = whatsappNumber(contact);
  return `https://wa.me/${number ?? ""}?text=${encodeURIComponent(text)}`;
}

/** mailto: link when the contact is an e-mail address, otherwise null. */
export function mailtoLink(
  contact: string,
  subject: string,
  body: string,
): string | null {
  const href = contactHref(contact);
  if (!href?.startsWith("mailto:")) return null;
  return `${href}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
