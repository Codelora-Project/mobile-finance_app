const DEFAULT_LOCALE = 'id-ID';
const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;

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

function getCurrencyFormatter(currencyCode: string, locale: string) {
  const cacheKey = `${locale}\u0000${currencyCode}`;
  const cached = currencyFormatterCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.NumberFormat(locale, {
    currency: currencyCode,
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

function assertNonNegativeSafeInteger(amountMinor: number) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new RangeError(
      'Money must use a non-negative safe integer minor-unit amount.',
    );
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

export function parseMoneyInput(input: string, currencyCode: string) {
  const normalizedInput = input.trim().replace(/\s/g, '');
  if (!/^\d[\d.,]*$/.test(normalizedInput)) {
    throw new RangeError('Money input contains unsupported characters.');
  }

  const fractionDigits = getCurrencyFractionDigits(currencyCode);
  const { fraction, major } = splitMoneyInput(normalizedInput, fractionDigits);
  const normalizedFraction = fraction.padEnd(fractionDigits, '0');
  const minorUnitText = `${major}${normalizedFraction}`.replace(
    /^0+(?=\d)/,
    '',
  );
  const amountMinor = Number(minorUnitText);

  assertMoney(amountMinor);
  return amountMinor;
}

export function formatMoney(
  amountMinor: number,
  currencyCode: string,
  locale = DEFAULT_LOCALE,
) {
  assertNonNegativeSafeInteger(amountMinor);
  const normalizedCurrencyCode = normalizeCurrencyCode(currencyCode);
  const fractionDigits = getCurrencyFractionDigits(normalizedCurrencyCode);
  const scale = 10n ** BigInt(fractionDigits);
  const amount = BigInt(amountMinor);
  const major = amount / scale;
  const fraction = (amount % scale).toString().padStart(fractionDigits, '0');
  const formatter = getCurrencyFormatter(normalizedCurrencyCode, locale);

  return formatter
    .formatToParts(Number(major))
    .map((part) =>
      part.type === 'fraction' ? localizeDigits(fraction, locale) : part.value,
    )
    .join('');
}

export function formatMoneyInput(amountMinor: number, currencyCode: string) {
  assertNonNegativeSafeInteger(amountMinor);
  const fractionDigits = getCurrencyFractionDigits(currencyCode);
  const scale = 10n ** BigInt(fractionDigits);
  const amount = BigInt(amountMinor);
  const major = amount / scale;

  if (fractionDigits === 0) {
    return major.toString();
  }

  const fraction = (amount % scale).toString().padStart(fractionDigits, '0');
  return `${major}.${fraction}`;
}

export function sumMoney(amountsMinor: readonly number[]) {
  let totalMinor = 0;

  for (const amountMinor of amountsMinor) {
    assertMoney(amountMinor);
    totalMinor += amountMinor;
    assertNonNegativeSafeInteger(totalMinor);
  }

  return totalMinor;
}
