const MILLISECONDS_PER_MINUTE = 60_000;

function getValidDate(unixMilliseconds: number) {
  if (!Number.isSafeInteger(unixMilliseconds)) {
    throw new RangeError('Timestamp must be a safe integer in milliseconds.');
  }

  const date = new Date(unixMilliseconds);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError('Timestamp is outside the supported Date range.');
  }

  return date;
}

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

function parseDatePart(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  return {
    day: Number(match[3]),
    month: Number(match[2]),
    year: Number(match[1]),
  };
}

function parseTimePart(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  return { hour: Number(match[1]), minute: Number(match[2]) };
}

export function getTimezoneOffsetMinutes(unixMilliseconds = Date.now()) {
  return -getValidDate(unixMilliseconds).getTimezoneOffset();
}

export function toLocalDate(
  unixMilliseconds: number,
  timezoneOffsetMinutes: number,
) {
  getValidDate(unixMilliseconds);
  if (!Number.isInteger(timezoneOffsetMinutes)) {
    throw new RangeError('Timezone offset must use whole minutes.');
  }

  const shiftedTimestamp =
    unixMilliseconds + timezoneOffsetMinutes * MILLISECONDS_PER_MINUTE;
  const shiftedDate = getValidDate(shiftedTimestamp);

  return [
    shiftedDate.getUTCFullYear(),
    padDatePart(shiftedDate.getUTCMonth() + 1),
    padDatePart(shiftedDate.getUTCDate()),
  ].join('-');
}

export function isLocalDate(value: string) {
  const parts = parseDatePart(value);
  if (!parts) {
    return false;
  }

  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(parts.year, parts.month - 1, parts.day);

  return (
    date.getUTCFullYear() === parts.year &&
    date.getUTCMonth() === parts.month - 1 &&
    date.getUTCDate() === parts.day
  );
}

export function toLocalDateTimeInput(
  unixMilliseconds: number,
  timezoneOffsetMinutes: number,
) {
  getValidDate(unixMilliseconds);
  if (!Number.isInteger(timezoneOffsetMinutes)) {
    throw new RangeError('Timezone offset must use whole minutes.');
  }

  const shiftedTimestamp =
    unixMilliseconds + timezoneOffsetMinutes * MILLISECONDS_PER_MINUTE;
  const shiftedDate = getValidDate(shiftedTimestamp);

  return {
    date: [
      shiftedDate.getUTCFullYear(),
      padDatePart(shiftedDate.getUTCMonth() + 1),
      padDatePart(shiftedDate.getUTCDate()),
    ].join('-'),
    time: [
      padDatePart(shiftedDate.getUTCHours()),
      padDatePart(shiftedDate.getUTCMinutes()),
    ].join(':'),
  };
}

export function parseLocalDateTimeInput(dateValue: string, timeValue: string) {
  const dateParts = parseDatePart(dateValue.trim());
  const timeParts = parseTimePart(timeValue.trim());
  if (!dateParts || !timeParts || !isLocalDate(dateValue.trim())) {
    throw new RangeError('Enter a valid date and time.');
  }

  const localDate = new Date(0);
  localDate.setFullYear(dateParts.year, dateParts.month - 1, dateParts.day);
  localDate.setHours(timeParts.hour, timeParts.minute, 0, 0);

  if (
    localDate.getFullYear() !== dateParts.year ||
    localDate.getMonth() !== dateParts.month - 1 ||
    localDate.getDate() !== dateParts.day ||
    localDate.getHours() !== timeParts.hour ||
    localDate.getMinutes() !== timeParts.minute
  ) {
    throw new RangeError('Enter a valid date and time.');
  }

  const occurredAt = localDate.getTime();
  return {
    localDate: dateValue.trim(),
    occurredAt,
    timezoneOffsetMinutes: getTimezoneOffsetMinutes(occurredAt),
  };
}

/**
 * Parses a local date string in `YYYY-MM-DD` format into a `Date` object
 * using **local midnight** (no timezone shift).
 *
 * Replaces the repeated pattern:
 * ```ts
 * const [y, m, d] = localDate.split('-').map(Number);
 * return new Date(y, m - 1, d);
 * ```
 * found across home-screen, transaction-history-screen, habit-repository, and
 * analytics-repository.
 *
 * @throws {RangeError} if the string is not a valid YYYY-MM-DD date.
 */
export function parseLocalDateStr(value: string): Date {
  const parts = parseDatePart(value);
  if (!parts) {
    throw new RangeError(`Invalid local date string: "${value}"`);
  }
  return new Date(parts.year, parts.month - 1, parts.day);
}

export function formatGroupDate(
  localDate: string,
  language: string,
  t: { transactions: { today: string; yesterday: string } },
) {
  const parts = parseDatePart(localDate);
  const date = parts
    ? new Date(parts.year, parts.month - 1, parts.day)
    : new Date();
  const today = new Date();
  const todayKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = [
    yesterday.getFullYear(),
    String(yesterday.getMonth() + 1).padStart(2, '0'),
    String(yesterday.getDate()).padStart(2, '0'),
  ].join('-');

  if (localDate === todayKey) {
    return t.transactions.today;
  }
  if (localDate === yesterdayKey) {
    return t.transactions.yesterday;
  }
  const locale = language === 'id' ? 'id-ID' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
