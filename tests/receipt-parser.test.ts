import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from '@jest/globals';

import { parseReceipt } from '@/features/receipts/receipt-parser';

function fixture(name: string) {
  return readFileSync(join(__dirname, 'fixtures', 'receipts', name), 'utf8');
}

describe('receipt parser', () => {
  it.each([
    ['indomaret-01.txt', 'INDOMARET KEMANG RAYA', '2026-08-14', 35_520],
    ['alfamart-01.txt', 'ALFAMART CIPETE', '2026-08-14', 48_500],
    ['restaurant-01.txt', 'WARUNG NUSANTARA', '2026-08-14', 110_000],
    ['parking-01.txt', 'PARKIR SENTRAL', '2026-08-14', 5_000],
  ])(
    'parses deterministic fields from %s',
    (name, merchant, localDate, totalMinor) => {
      expect(parseReceipt(fixture(name))).toMatchObject({
        localDate,
        merchant,
        totalMinor,
      });
    },
  );

  it('prioritizes grand total and parses optional subtotal and tax', () => {
    expect(parseReceipt(fixture('indomaret-01.txt'))).toMatchObject({
      subtotalMinor: 32_000,
      taxMinor: 3_520,
      totalMinor: 35_520,
      warnings: [],
    });
  });

  it('returns warnings and nulls for unusable text', () => {
    expect(parseReceipt(fixture('malformed-01.txt'))).toEqual({
      localDate: null,
      merchant: null,
      subtotalMinor: null,
      taxMinor: null,
      totalMinor: null,
      warnings: ['merchant_not_found', 'date_not_found', 'total_not_found'],
    });
  });
});
