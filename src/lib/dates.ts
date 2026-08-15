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
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
