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

  it('parses real-world restaurant receipt (Wingz O Wingz)', () => {
    const rawText = `
Wingz O Wingz Cimahi
Jln Gatot Subroto No 30, Cimahi Tengah, Cimahi,
Jawa Barat, 40523
+6222206735860
26081012418IBEIGUM
Bill Number: WOW063
Settle Time: 10 Aug 2026 12:41
Settled By: abdurrahman zakaria
Takeaway: 1 Pax
Customer: CITRA -9417
C. Bowl Pop Chop
+ .Hot Magma
+ Rice
1 x 25.000 25.000
C. Bowl Pop Chop
+ .Spicy mayo
+ Rice
1 x 25.000 25.000
Corn Soup
1 x 15.000 15.000
Subtotal 65.000
Total 65.000
Cash 100.000
Change 35.000
X: @wingzowingz
Instagram: @wingzowingz
WhatsApp: 0817783000
10 Aug 2026 12:41
MAKAN ENAK ITU BIKIN HAPPY, KALO KURANG PUAS
`;
    const result = parseReceipt(rawText);
    expect(result).toMatchObject({
      localDate: '2026-08-10',
      merchant: 'Wingz O Wingz Cimahi',
      subtotalMinor: 65_000,
      totalMinor: 65_000,
      warnings: [],
    });
  });

  it('parses multi-line separated columns (Total label on line N, amount on line N+1)', () => {
    const rawText = `
Kopi Kenangan Senopati
10 Agu 2026
Subtotal
Total
42.000
Cash
50.000
Change
8.000
`;
    const result = parseReceipt(rawText);
    expect(result).toMatchObject({
      localDate: '2026-08-10',
      merchant: 'Kopi Kenangan Senopati',
      totalMinor: 42_000,
      warnings: [],
    });
  });

  it('correctly handles Indonesian decimal cents (,00 / .00)', () => {
    const rawText = `
SUPERINDO DAGO
12-08-2026
SUBTOTAL Rp 85.500,00
TOTAL BAYAR Rp 85.500,00
TUNAI Rp 100.000,00
KEMBALIAN Rp 14.500,00
`;
    const result = parseReceipt(rawText);
    expect(result).toMatchObject({
      localDate: '2026-08-12',
      merchant: 'SUPERINDO DAGO',
      totalMinor: 85_500,
      warnings: [],
    });
  });

  it('handles OCR typos and symbols in Total label (Tota], Tota1, TOTAL:)', () => {
    const rawText = `
MIE GACOAN CIMAHI
10-Agustus-2026
Tota]: Rp. 48.000,-
Cash: Rp. 50.000,-
Kembali: Rp. 2.000,-
`;
    const result = parseReceipt(rawText);
    expect(result).toMatchObject({
      localDate: '2026-08-10',
      merchant: 'MIE GACOAN CIMAHI',
      totalMinor: 48_000,
    });
  });

  it('returns warnings and nulls for unusable text', () => {
    expect(parseReceipt(fixture('malformed-01.txt'))).toEqual({
      candidateAmounts: [],
      localDate: null,
      merchant: null,
      subtotalMinor: null,
      taxMinor: null,
      totalMinor: null,
      warnings: ['merchant_not_found', 'date_not_found', 'total_not_found'],
    });
  });
});
