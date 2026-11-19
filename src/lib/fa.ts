const FA = "۰۱۲۳۴۵۶۷۸۹";

/** Latin digits → Persian digits (display only). */
export function fa(value: string | number): string {
  return String(value).replace(/\d/g, (d) => FA[Number(d)]);
}

/** Persian and Arabic-Indic digits → Latin digits (for what is sent to the server). */
export function latin(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

/**
 * The mobile field shows a fixed «۰۹» and takes the remaining 9 digits.
 * Accepts what people type or paste: Persian digits, spaces, dashes,
 * and the whole number in 09…, 9…, 989…, +989… or 00989… form.
 * Returns the 9 digits after «09» (possibly fewer while typing).
 */
export function mobileRest(raw: string): string {
  let d = latin(raw).replace(/\D/g, "");
  if (d.startsWith("0098")) d = d.slice(4);
  else if (d.startsWith("98") && d.length > 10) d = d.slice(2);
  if (d.startsWith("09")) d = d.slice(2);
  else if (d.startsWith("9") && d.length === 10) d = d.slice(1);
  return d.slice(0, 9);
}

/** Full number for the server, or null if it is not a complete Iranian mobile. */
export function fullMobile(rest: string): string | null {
  return /^\d{9}$/.test(rest) ? `09${rest}` : null;
}

/** «۰۹۱۲ ۳۴۵ ۶۷۸۹» style, Persian digits. */
export function showMobile(mobile: string): string {
  const d = latin(mobile).replace(/\D/g, "");
  if (d.length !== 11) return fa(d);
  return fa(`${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`);
}

/** Six-digit code: Persian digits allowed, only digits kept. */
export function codeDigits(raw: string): string {
  return latin(raw).replace(/\D/g, "").slice(0, 6);
}
