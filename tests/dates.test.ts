import { describe, expect, it } from '@jest/globals';

import {
  getTimezoneOffsetMinutes,
  isLocalDate,
  parseLocalDateTimeInput,
  toLocalDate,
  toLocalDateTimeInput,
} from '@/lib/dates';

describe('date utilities', () => {
  it('generates local_date using the stored positive timezone offset', () => {
    const occurredAt = Date.UTC(2026, 7, 15, 18, 30);

    expect(toLocalDate(occurredAt, 7 * 60)).toBe('2026-08-16');
  });

  it('generates local_date across the previous-day boundary', () => {
    const occurredAt = Date.UTC(2026, 7, 15, 2, 30);

    expect(toLocalDate(occurredAt, -5 * 60)).toBe('2026-08-14');
  });

  it('returns an offset whose sign follows local time = UTC + offset', () => {
    const occurredAt = Date.UTC(2026, 0, 1, 12);

    expect(getTimezoneOffsetMinutes(occurredAt)).toBe(
      -new Date(occurredAt).getTimezoneOffset(),
    );
  });

  it('validates calendar local-date strings', () => {
    expect(isLocalDate('2024-02-29')).toBe(true);
    expect(isLocalDate('2025-02-29')).toBe(false);
    expect(isLocalDate('2026-8-15')).toBe(false);
  });

  it('rejects invalid timestamps and fractional timezone offsets', () => {
    expect(() => toLocalDate(Number.MAX_SAFE_INTEGER, 0)).toThrow(RangeError);
    expect(() => toLocalDate(Date.now(), 420.5)).toThrow(RangeError);
  });

  it('round-trips an editable local date and time', () => {
    const parsed = parseLocalDateTimeInput('2026-08-15', '09:30');

    expect(
      toLocalDateTimeInput(parsed.occurredAt, parsed.timezoneOffsetMinutes),
    ).toEqual({ date: '2026-08-15', time: '09:30' });
    expect(parsed.localDate).toBe('2026-08-15');
  });

  it('rejects invalid local date and time input', () => {
    expect(() => parseLocalDateTimeInput('2026-02-30', '09:30')).toThrow(
      RangeError,
    );
    expect(() => parseLocalDateTimeInput('2026-08-15', '25:00')).toThrow(
      RangeError,
    );
  });
});
