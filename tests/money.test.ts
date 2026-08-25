import { describe, expect, it } from '@jest/globals';

import {
  assertMoney,
  formatMoney,
  formatMoneyInput,
  formatShortcutLabel,
  getCurrencyFractionDigits,
  parseMoneyInput,
  parseSignedMoneyInput,
  sumMoney,
} from '@/lib/money';

describe('money utilities', () => {
  it('uses the currency fraction digits defined by Intl', () => {
    expect(getCurrencyFractionDigits('IDR')).toBe(0);
    expect(getCurrencyFractionDigits('USD')).toBe(2);
    expect(getCurrencyFractionDigits('JPY')).toBe(0);
  });

  it('parses IDR input into integer minor units', () => {
    expect(parseMoneyInput('35.000', 'IDR')).toBe(35_000);
    expect(parseMoneyInput('35 000', 'idr')).toBe(35_000);
  });

  it('parses USD input with either common decimal convention', () => {
    expect(parseMoneyInput('12.50', 'USD')).toBe(1_250);
    expect(parseMoneyInput('1,234.56', 'USD')).toBe(123_456);
    expect(parseMoneyInput('1.234,56', 'USD')).toBe(123_456);
  });

  it('parses JPY input without fractional units', () => {
    expect(parseMoneyInput('1,250', 'JPY')).toBe(1_250);
    expect(parseMoneyInput('1.250', 'JPY')).toBe(1_250);
  });

  it('parses zero and negative wallet balances using currency fractions', () => {
    expect(parseSignedMoneyInput('0', 'USD')).toBe(0);
    expect(parseSignedMoneyInput('-12.50', 'USD')).toBe(-1_250);
    expect(parseSignedMoneyInput('-35.000', 'IDR')).toBe(-35_000);
    expect(() => parseSignedMoneyInput('12.3456', 'USD')).toThrow(RangeError);
  });

  it('formats currencies without hard-coded symbols', () => {
    expect(formatMoney(35_000, 'IDR', 'id-ID')).toBe('Rp\u00a035.000');
    expect(formatMoney(1_250, 'USD', 'en-US')).toBe('$12.50');
    expect(formatMoney(1_250, 'JPY', 'ja-JP')).toBe('￥1,250');
    expect(formatMoney(0, 'USD', 'en-US')).toBe('$0.00');
    expect(formatMoney(-35_000, 'IDR', 'id-ID')).toBe('-Rp\u00a035.000');
    expect(formatMoney(-1_250, 'USD', 'en-US')).toBe('-$12.50');
  });

  it('formats every safe minor-unit digit without floating-point loss', () => {
    expect(formatMoney(Number.MAX_SAFE_INTEGER, 'USD', 'en-US')).toBe(
      '$90,071,992,547,409.91',
    );
  });

  it('formats editable amounts without changing their minor-unit value', () => {
    expect(formatMoneyInput(1_250, 'USD')).toBe('12.50');
    expect(formatMoneyInput(-1_250, 'USD')).toBe('-12.50');
    expect(parseMoneyInput(formatMoneyInput(1_250, 'USD'), 'USD')).toBe(1_250);
    expect(
      parseMoneyInput(formatMoneyInput(Number.MAX_SAFE_INTEGER, 'USD'), 'USD'),
    ).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('rejects invalid, non-positive, fractional, and unsafe amounts', () => {
    expect(() => assertMoney(1)).not.toThrow();
    expect(() => assertMoney(Number.MAX_SAFE_INTEGER)).not.toThrow();
    expect(() => assertMoney(0)).toThrow(RangeError);
    expect(() => assertMoney(-1)).toThrow(RangeError);
    expect(() => assertMoney(1.5)).toThrow(RangeError);
    expect(() => assertMoney(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError);
    expect(() => parseMoneyInput('12.5', 'JPY')).toThrow(RangeError);
    expect(() => parseMoneyInput('1.2345', 'USD')).toThrow(RangeError);
    expect(() => parseMoneyInput('-100', 'IDR')).toThrow(RangeError);
  });

  it('sums money with safe integer checks', () => {
    expect(sumMoney([])).toBe(0);
    expect(sumMoney([100, 250, 650])).toBe(1_000);
    expect(() => sumMoney([Number.MAX_SAFE_INTEGER, 1])).toThrow(RangeError);
  });

  it('formats shortcut labels correctly with and without currency symbols', () => {
    // IDR / Default
    expect(formatShortcutLabel(500)).toBe('+500');
    expect(formatShortcutLabel(2_000)).toBe('+2k');
    expect(formatShortcutLabel(15_000)).toBe('+15k');
    expect(formatShortcutLabel(1_500_000)).toBe('+1.5M');
    expect(formatShortcutLabel(2_000, 'Rp')).toBe('+2k');

    // Multi-currency symbols
    expect(formatShortcutLabel(1, '$')).toBe('+$1');
    expect(formatShortcutLabel(5, '$')).toBe('+$5');
    expect(formatShortcutLabel(10, '$')).toBe('+$10');
    expect(formatShortcutLabel(20, '€')).toBe('+€20');
    expect(formatShortcutLabel(50, 'S$')).toBe('+S$50');
    expect(formatShortcutLabel(500, '¥')).toBe('+¥500');
    expect(formatShortcutLabel(1_000, '$')).toBe('+$1k');
  });
});
