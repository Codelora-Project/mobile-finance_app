const DEFAULT_LOCALE = 'id-ID';
const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;
const CURRENCY_FRACTION_DIGIT_OVERRIDES: Readonly<Record<string, number>> = {
  // Android's Intl data can report two fraction digits for IDR, while the MVP
  // contract stores and displays rupiah as whole minor units (35000 = Rp35.000).
  IDR: 0,
};

const fractionDigitsCache = new Map<string, number>();
const currencyFormatterCache = new Map<string, Intl.NumberFormat>();
const digitMapCache = new Map<string, readonly string[]>();

function normalizeCurrencyCode(currencyCode: string) {
  const normalized = currencyCode.trim().toUpperCase();

  if (!CURRENCY_CODE_PATTERN.test(normalized)) {
    throw new RangeError('Currency code must be a three-letter ISO 4217 code.');
  }

  return normalized;
}

function getCurrencyFormatter(
  currencyCode: string,
  locale: string,
  fractionDigits: number,
) {
  const cacheKey = `${locale}\u0000${currencyCode}\u0000${fractionDigits}`;
  const cached = currencyFormatterCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.NumberFormat(locale, {
    currency: currencyCode,
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
    style: 'currency',
  });
  currencyFormatterCache.set(cacheKey, formatter);
  return formatter;
}

function getLocalizedDigitMap(locale: string) {
  const cached = digitMapCache.get(locale);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.NumberFormat(locale, { useGrouping: false });
  const digits = Array.from({ length: 10 }, (_, digit) =>
    formatter.format(digit),
  );
  digitMapCache.set(locale, digits);
  return digits;
}

function localizeDigits(value: string, locale: string) {
  const digits = getLocalizedDigitMap(locale);
  return value.replace(/\d/g, (digit) => digits[Number(digit)] ?? digit);
}

function assertSafeInteger(amountMinor: number) {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new RangeError('Money must use a safe integer minor-unit amount.');
  }
}

function parseGroupedInteger(value: string, separator?: string) {
  if (!separator) {
    if (!/^\d+$/.test(value)) {
      throw new RangeError('Money input must contain digits only.');
    }
    return value;
  }

  const groups = value.split(separator);
  const [firstGroup, ...remainingGroups] = groups;
  if (
    !firstGroup ||
    !/^\d{1,3}$/.test(firstGroup) ||
    (groups.length > 1 && firstGroup === '0') ||
    remainingGroups.some((group) => !/^\d{3}$/.test(group))
  ) {
    throw new RangeError('Money input has invalid grouping separators.');
  }

  return groups.join('');
}

function findSeparators(value: string) {
  return Array.from(value.matchAll(/[.,]/g), (match) => ({
    character: match[0],
    index: match.index ?? 0,
  }));
}

function splitMoneyInput(value: string, fractionDigits: number) {
  const separators = findSeparators(value);
  if (separators.length === 0) {
    return { fraction: '', major: parseGroupedInteger(value) };
  }

  const separatorKinds = new Set(
    separators.map((separator) => separator.character),
  );

  if (fractionDigits === 0) {
    if (separatorKinds.size !== 1) {
      throw new RangeError('Money input mixes grouping separators.');
    }
    return {
      fraction: '',
      major: parseGroupedInteger(value, separators[0]?.character),
    };
  }

  const lastSeparator = separators.at(-1);
  if (!lastSeparator) {
    throw new RangeError('Money input has invalid separators.');
  }

  const trailingDigitCount = value.length - lastSeparator.index - 1;
  const usesDecimalSeparator =
    trailingDigitCount > 0 && trailingDigitCount <= fractionDigits;

  if (!usesDecimalSeparator) {
    if (trailingDigitCount !== 3 || separatorKinds.size !== 1) {
      throw new RangeError('Money input has too many fraction digits.');
    }
    return {
      fraction: '',
      major: parseGroupedInteger(value, lastSeparator.character),
    };
  }

  const integerPart = value.slice(0, lastSeparator.index);
  const fraction = value.slice(lastSeparator.index + 1);
  const groupingSeparators = findSeparators(integerPart);
  const groupingKinds = new Set(
    groupingSeparators.map((separator) => separator.character),
  );

  if (
    groupingKinds.size > 1 ||
    (groupingKinds.size === 1 && groupingKinds.has(lastSeparator.character))
  ) {
    throw new RangeError('Money input has invalid grouping separators.');
  }

  return {
    fraction,
    major: parseGroupedInteger(integerPart, groupingSeparators[0]?.character),
  };
}

export function getCurrencyFractionDigits(currencyCode: string) {
  const normalizedCurrencyCode = normalizeCurrencyCode(currencyCode);
  const override = CURRENCY_FRACTION_DIGIT_OVERRIDES[normalizedCurrencyCode];
  if (override !== undefined) {
    return override;
  }
  const cached = fractionDigitsCache.get(normalizedCurrencyCode);
  if (cached !== undefined) {
    return cached;
  }

  const fractionDigits = new Intl.NumberFormat('en', {
    currency: normalizedCurrencyCode,
    style: 'currency',
  }).resolvedOptions().maximumFractionDigits;
  if (typeof fractionDigits !== 'number') {
    throw new RangeError('Currency fraction digits could not be resolved.');
  }
  fractionDigitsCache.set(normalizedCurrencyCode, fractionDigits);
  return fractionDigits;
}

export function assertMoney(amountMinor: number) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new RangeError(
      'Money must use a positive safe integer minor-unit amount.',
    );
  }
}

function parseMoneyInputToMinor(
  input: string,
  currencyCode: string,
  allowSignedZero: boolean,
) {
  const trimmedInput = input.trim().replace(/\s/g, '');
  const isNegative = trimmedInput.startsWith('-');
  const normalizedInput = isNegative ? trimmedInput.slice(1) : trimmedInput;
  if (!/^\d[\d.,]*$/.test(normalizedInput)) {
    throw new RangeError('Money input contains unsupported characters.');
  }
  if (isNegative && !allowSignedZero) {
    throw new RangeError('Money input must be greater than zero.');
  }

  const fractionDigits = getCurrencyFractionDigits(currencyCode);
  const { fraction, major } = splitMoneyInput(normalizedInput, fractionDigits);
  const normalizedFraction = fraction.padEnd(fractionDigits, '0');
  const minorUnitText = `${major}${normalizedFraction}`.replace(
    /^0+(?=\d)/,
    '',
  );
  const amountMinor = Number(minorUnitText);

  if (!Number.isSafeInteger(amountMinor)) {
    throw new RangeError('Money must use a safe integer minor-unit amount.');
  }
  if (!allowSignedZero && amountMinor <= 0) {
    throw new RangeError('Money input must be greater than zero.');
  }

  return isNegative ? -amountMinor : amountMinor;
}

export function parseMoneyInput(input: string, currencyCode: string) {
  return parseMoneyInputToMinor(input, currencyCode, false);
}

/** Parses wallet balances, which may legitimately be zero or negative. */
export function parseSignedMoneyInput(input: string, currencyCode: string) {
  return parseMoneyInputToMinor(input, currencyCode, true);
}

export function formatMoney(
  amountMinor: number,
  currencyCode: string,
  locale = DEFAULT_LOCALE,
) {
  const safeMinor = Number.isFinite(amountMinor) ? Math.round(amountMinor) : 0;
  assertSafeInteger(safeMinor);
  const isNegative = safeMinor < 0;
  const absAmount = Math.abs(safeMinor);
  const normalizedCurrencyCode = normalizeCurrencyCode(currencyCode);
  const fractionDigits = getCurrencyFractionDigits(normalizedCurrencyCode);
  const scale = 10n ** BigInt(fractionDigits);
  const amount = BigInt(absAmount);
  const major = amount / scale;
  const fraction = (amount % scale).toString().padStart(fractionDigits, '0');
  const formatter = getCurrencyFormatter(
    normalizedCurrencyCode,
    locale,
    fractionDigits,
  );

  const formatted = formatter
    .formatToParts(Number(major))
    .map((part) =>
      part.type === 'fraction' ? localizeDigits(fraction, locale) : part.value,
    )
    .join('');

  return isNegative ? `-${formatted}` : formatted;
}

export function formatMoneyInput(amountMinor: number, currencyCode: string) {
  const safeMinor = Number.isFinite(amountMinor) ? Math.round(amountMinor) : 0;
  assertSafeInteger(safeMinor);
  const isNegative = safeMinor < 0;
  const absAmount = Math.abs(safeMinor);
  const fractionDigits = getCurrencyFractionDigits(currencyCode);
  const scale = 10n ** BigInt(fractionDigits);
  const amount = BigInt(absAmount);
  const major = amount / scale;

  let result: string;
  if (fractionDigits === 0) {
    result = major.toString();
  } else {
    const fraction = (amount % scale).toString().padStart(fractionDigits, '0');
    result = `${major}.${fraction}`;
  }

  return isNegative ? `-${result}` : result;
}

export function sumMoney(amountsMinor: readonly number[]) {
  let totalMinor = 0;

  for (const amountMinor of amountsMinor) {
    assertMoney(amountMinor);
    totalMinor += amountMinor;
    assertSafeInteger(totalMinor);
  }

  return totalMinor;
}

/**
 * Formats a signed net amount with a `+` or `−` prefix.
 * Positive values get `+`, negative values get `−` (true minus, not hyphen),
 * and zero returns the plain currency string without a sign.
 *
 * Replaces the `formatNet()` helper that was duplicated in home-screen and
 * analytics-screen.
 */
export function formatSignedMoney(
  amountMinor: number,
  currencyCode: string,
  locale?: string,
) {
  if (amountMinor < 0) {
    return `\u2212${formatMoney(Math.abs(amountMinor), currencyCode, locale)}`;
  }
  if (amountMinor > 0) {
    return `+${formatMoney(amountMinor, currencyCode, locale)}`;
  }
  return formatMoney(0, currencyCode, locale);
}

/**
 * Formats a shortcut amount into a compact label: `+15k`, `+1.5M`, `+$5`, `+€10`.
 *
 * Replaces the `formatShortcutLabel()` helper that was duplicated in
 * settings-screen and manual-transaction-screen.
 */
export function formatShortcutLabel(
  amount: number,
  currencySymbol?: string,
): string {
  const sym = currencySymbol && currencySymbol !== 'Rp' ? currencySymbol : '';
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000;
    return `+${sym}${Number.isInteger(m) ? m : m.toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    const k = amount / 1_000;
    return `+${sym}${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return `+${sym}${amount}`;
}
