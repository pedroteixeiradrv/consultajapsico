/**
 * WhatsApp helpers — normalize BR / E.164 and build wa.me deep links.
 */

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Accepts E.164 (+5511999999999), BR local (11999999999 / 11 99999-9999),
 * or with country 55. Returns digits for wa.me (no plus) or null if invalid.
 */
export function normalizeWhatsApp(input: string): string | null {
  let d = digitsOnly(input);
  if (!d) return null;
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length === 10 || d.length === 11) {
    d = "55" + d;
  }
  if (d.length < 12 || d.length > 15) return null;
  return d;
}

export function whatsappMeUrl(
  whatsapp: string | null | undefined
): string | null {
  if (!whatsapp) return null;
  const n = normalizeWhatsApp(whatsapp);
  if (!n) return null;
  return `https://wa.me/${n}`;
}

export function isValidWhatsApp(input: string): boolean {
  return normalizeWhatsApp(input) !== null;
}
