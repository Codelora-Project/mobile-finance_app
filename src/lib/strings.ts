export function normalizeText(value: string) {
  return value.normalize('NFC').trim().replace(/\s+/g, ' ');
}

export function normalizeOptionalText(value: string) {
  const normalized = normalizeText(value);
  return normalized.length > 0 ? normalized : null;
}

export function normalizeSearchText(value: string) {
  return normalizeText(value).toLowerCase();
}

/**
 * Strips all non-digit characters from a string and parses the result as a
 * positive integer. Returns `null` if the result is zero, NaN, or negative.
 *
 * Use this for raw numeric input fields (e.g. amount entry, shortcut values)
 * instead of repeating `parseInt(str.replace(/\D/g, ''), 10)` everywhere.
 */
export function parseIntegerInput(value: string): number | null {
  const digits = value.replace(/\D/g, '');
  if (!digits) return null;
  const parsed = parseInt(digits, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}
