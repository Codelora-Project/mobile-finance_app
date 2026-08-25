export function normalizeText(value: string) {
  return value.normalize('NFC').trim().replace(/\s+/g, ' ');
}

export function normalizeOptionalText(value?: string | null) {
  if (value == null) return null;
  const normalized = normalizeText(value);
  return normalized.length > 0 ? normalized : null;
}

export function normalizeSearchText(value: string) {
  return normalizeText(value).toLowerCase();
}
