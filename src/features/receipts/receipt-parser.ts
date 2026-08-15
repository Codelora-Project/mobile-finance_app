import { isLocalDate } from '@/lib/dates';

export type ReceiptParseWarning =
  'merchant_not_found' | 'date_not_found' | 'total_not_found';

export type ParsedReceipt = Readonly<{
  merchant: string | null;
  localDate: string | null;
  totalMinor: number | null;
  subtotalMinor: number | null;
  taxMinor: number | null;
  warnings: readonly ReceiptParseWarning[];
}>;

const MONTHS: Readonly<Record<string, number>> = {
  apr: 4,
  aug: 8,
  dec: 12,
  feb: 2,
  jan: 1,
  jul: 7,
  jun: 6,
  mar: 3,
  may: 5,
  nov: 11,
  oct: 10,
  sep: 9,
};

const EXCLUDED_TOTAL = /\b(?:SUB\s*TOTAL|CASH|TENDER|CHANGE|KEMBALI|TUNAI)\b/i;
const TOTAL_RULES = [
  { pattern: /\bGRAND\s+TOTAL\b/i, score: 60 },
  { pattern: /\bTOTAL\s+(?:PAYMENT|BAYAR)\b/i, score: 55 },
  { pattern: /\bTOTAL\b/i, score: 45 },
  { pattern: /\bJUMLAH\b/i, score: 35 },
  { pattern: /\bAMOUNT\b/i, score: 30 },
] as const;
const SUBTOTAL_PATTERN = /\bSUB\s*TOTAL\b/i;
const TAX_PATTERN = /\b(?:SERVICE\s+TAX|TAX|PPN|VAT|PB1)\b/i;
const MONEY_PATTERN =
  /(?:RP\.?\s*)?(\d{1,3}(?:[.,\s]\d{3})+|\d{4,12})(?:[.,]-)?/gi;

function normalizeLines(rawText: string) {
  return rawText
    .normalize('NFC')
    .replace(/\r/g, '\n')
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function parseAmount(line: string) {
  const values = Array.from(line.matchAll(MONEY_PATTERN), (match) => {
    const digits = (match[1] ?? '').replace(/\D/g, '');
    const value = Number(digits);
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }).filter((value): value is number => value !== null);
  return values.at(-1) ?? null;
}

function findLabeledAmount(
  lines: readonly string[],
  pattern: RegExp,
  exclude?: RegExp,
) {
  for (const line of lines) {
    if (pattern.test(line) && !exclude?.test(line)) {
      const amount = parseAmount(line);
      if (amount !== null) {
        return amount;
      }
    }
  }
  return null;
}

function findTotal(lines: readonly string[]) {
  let best: { amount: number; score: number } | null = null;
  for (const [index, line] of lines.entries()) {
    if (EXCLUDED_TOTAL.test(line)) {
      continue;
    }
    for (const rule of TOTAL_RULES) {
      if (!rule.pattern.test(line)) {
        continue;
      }
      const amount = parseAmount(line);
      if (amount === null) {
        continue;
      }
      const candidate = { amount, score: rule.score + index / lines.length };
      if (!best || candidate.score > best.score) {
        best = candidate;
      }
      break;
    }
  }
  return best?.amount ?? null;
}

function formatDate(year: number, month: number, day: number) {
  const value = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return isLocalDate(value) ? value : null;
}

function findDate(lines: readonly string[]) {
  for (const line of lines) {
    const iso = /\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/.exec(line);
    if (iso) {
      const value = formatDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
      if (value) return value;
    }
    const local = /\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/.exec(line);
    if (local) {
      const value = formatDate(
        Number(local[3]),
        Number(local[2]),
        Number(local[1]),
      );
      if (value) return value;
    }
    const named = /\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(20\d{2})\b/i.exec(line);
    if (named) {
      const month = MONTHS[named[2].slice(0, 3).toLowerCase()];
      if (month) {
        const value = formatDate(Number(named[3]), month, Number(named[1]));
        if (value) return value;
      }
    }
  }
  return null;
}

function findMerchant(lines: readonly string[]) {
  const excluded =
    /^(?:\W*(?:THANK\s+YOU|TERIMA\s+KASIH)|RECEIPT|STRUK|INVOICE|NOTA|DATE|TANGGAL|TIME|TEL|PHONE|NPWP|CASHIER|KASIR|TOTAL|SUB\s*TOTAL|TAX|PPN|VAT|PB1)\b/i;
  for (const line of lines.slice(0, 8)) {
    const letters = line.match(/[A-Za-z]/g)?.length ?? 0;
    if (
      letters >= 3 &&
      letters >= line.length * 0.35 &&
      !excluded.test(line) &&
      !/^\W*\d/.test(line)
    ) {
      return line.slice(0, 120);
    }
  }
  return null;
}

export function parseReceipt(rawText: string): ParsedReceipt {
  const lines = normalizeLines(rawText);
  const merchant = findMerchant(lines);
  const localDate = findDate(lines);
  const totalMinor = findTotal(lines);
  const warnings: ReceiptParseWarning[] = [];
  if (!merchant) warnings.push('merchant_not_found');
  if (!localDate) warnings.push('date_not_found');
  if (totalMinor === null) warnings.push('total_not_found');

  return {
    localDate,
    merchant,
    subtotalMinor: findLabeledAmount(lines, SUBTOTAL_PATTERN),
    taxMinor: findLabeledAmount(lines, TAX_PATTERN),
    totalMinor,
    warnings,
  };
}
