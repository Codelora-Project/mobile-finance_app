import { isLocalDate } from '@/lib/dates';

export type ReceiptParseWarning =
  'merchant_not_found' | 'date_not_found' | 'total_not_found';

export type ParsedReceipt = Readonly<{
  merchant: string | null;
  localDate: string | null;
  totalMinor: number | null;
  subtotalMinor: number | null;
  taxMinor: number | null;
  candidateAmounts: readonly number[];
  warnings: readonly ReceiptParseWarning[];
}>;

const MONTHS: Readonly<Record<string, number>> = {
  jan: 1,
  januari: 1,
  january: 1,
  feb: 2,
  februari: 2,
  february: 2,
  mar: 3,
  maret: 3,
  march: 3,
  apr: 4,
  april: 4,
  mei: 5,
  may: 5,
  jun: 6,
  juni: 6,
  june: 6,
  jul: 7,
  juli: 7,
  july: 7,
  agu: 8,
  agt: 8,
  agustus: 8,
  aug: 8,
  august: 8,
  sep: 9,
  september: 9,
  okt: 10,
  oct: 10,
  oktober: 10,
  october: 10,
  nov: 11,
  nop: 11,
  nopember: 11,
  november: 11,
  des: 12,
  dec: 12,
  desember: 12,
  december: 12,
};

const EXCLUDED_TOTAL_PREFIX =
  /\b(?:CASH|TUNAI|TENDER|CHANGE|KEMBALI|KEMBALIAN|DIBAYAR|BAYAR\/CASH|SISA)\b/i;

const ADDRESS_OR_HEADER_PATTERN =
  /\b(?:JL|JLN|JALAN|GATOT|SUBROTO|SUDIRMAN|THAMRIN|RAYA|NO\.\s*\d+|KOTA|KECAMATAN|KELURAHAN|KABUPATEN|PROVINSI|PROV|JAWA|SUMATERA|BALI|INDONESIA|RT\s*\d+|RW\s*\d+|TELP?|PHONE|HP|FAX|NPWP|KODEPOS|POS\s*\d+|BILL\s*NUMBER|TABLE|MEJA|WA\b|WHATSAPP|IG\b|INSTAGRAM)\b/i;

const TOTAL_RULES = [
  {
    pattern:
      /(?:^|\s|\W)(?:GRAND\s*TOTAL|TOTAL\s*AKHIR|JUMLAH\s*TOTAL|TOTAL\s*BAYAR|TOTAL\s*PEMBAYARAN|TOTAL\s*TAGIHAN|TOTAL\s*BELANJA)(?:$|\s|\W)/i,
    score: 90,
  },
  {
    pattern:
      /(?:^|\s|\W)(?:TOTAL|TOTA[L1l|\]\}]|JUMLAH|TAGIHAN|AMOUNT(?:\s*DUE)?|NET\s*TOTAL|TOTAL\s*HARGA|TARIF|BIAYA)(?:$|\s|\W)/i,
    score: 70,
  },
  {
    pattern: /(?:^|\s|\W)(?:SUB\s*TOTAL|SUBTOTAL)(?:$|\s|\W)/i,
    score: 40,
  },
] as const;

const SUBTOTAL_PATTERN = /\b(?:SUB\s*TOTAL|SUBTOTAL)\b/i;
const TAX_PATTERN = /\b(?:SERVICE\s*TAX|PB1|PPN|TAX|VAT|PAJAK)\b/i;

// Regex that captures formatted currency numbers like 65.000, 65,000.00, 65.000,00, Rp 65.000,-
const MONEY_PATTERN =
  /(?:RP\.?\s*)?(\d{1,3}(?:[.,\s]\d{3})+(?:[.,]\d{2})?|\d{4,12}(?:[.,]\d{2})?|\d{1,3}(?:[.,]\d{3})+)(?:[.,]-)?/gi;

function normalizeLines(rawText: string): string[] {
  return rawText
    .normalize('NFC')
    .replace(/\r/g, '\n')
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/**
 * Extracts numeric value from a string, correctly handling Indonesian Rupiah
 * formatting including thousand separators and optional decimal cents (,00 / .00).
 */
export function parseAmount(line: string, isHeader = false): number | null {
  const values: number[] = [];

  for (const match of line.matchAll(MONEY_PATTERN)) {
    let raw = match[1] ?? '';
    if (!raw) continue;

    // Handle decimal cents in IDR (e.g. 65.000,00 or 65000.00)
    const decimalMatch = /^(.*)[.,](\d{2})$/.exec(raw);
    if (decimalMatch && decimalMatch[1]) {
      raw = decimalMatch[1];
    }

    const hasThousandSeparator = /[.,\s]\d{3}/.test(raw);
    const digits = raw.replace(/\D/g, '');
    const value = Number(digits);

    // Filter out postal codes (5 digits without thousand separator in address/header lines)
    if (isHeader && !hasThousandSeparator && digits.length === 5) {
      continue;
    }

    // Exclude phone numbers (starts with 08 or 62 with 10+ digits) or tax numbers
    if (
      digits.length >= 10 &&
      (digits.startsWith('08') || digits.startsWith('62'))
    ) {
      continue;
    }

    // Validate sane IDR transaction amount range (Rp 100 to Rp 1,000,000,000)
    if (Number.isSafeInteger(value) && value >= 100 && value <= 1_000_000_000) {
      values.push(value);
    }
  }

  return values.at(-1) ?? null;
}

function findLabeledAmount(
  lines: readonly string[],
  pattern: RegExp,
  exclude?: RegExp,
): number | null {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (ADDRESS_OR_HEADER_PATTERN.test(line)) continue;

    if (pattern.test(line) && !exclude?.test(line)) {
      // 1. Try amount on current line
      let amount = parseAmount(line);
      if (amount !== null) return amount;

      // 2. Try next line if label is on its own line
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1]!;
        if (
          !EXCLUDED_TOTAL_PREFIX.test(nextLine) &&
          !ADDRESS_OR_HEADER_PATTERN.test(nextLine)
        ) {
          amount = parseAmount(nextLine);
          if (amount !== null) return amount;
        }
      }
    }
  }
  return null;
}

function extractAllCandidates(lines: readonly string[]): number[] {
  const seen = new Set<number>();
  const candidates: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const isHeader = i < 4 || ADDRESS_OR_HEADER_PATTERN.test(line);

    for (const match of line.matchAll(MONEY_PATTERN)) {
      let raw = match[1] ?? '';
      const decimalMatch = /^(.*)[.,](\d{2})$/.exec(raw);
      if (decimalMatch && decimalMatch[1]) {
        raw = decimalMatch[1];
      }

      const hasThousandSeparator = /[.,\s]\d{3}/.test(raw);
      const digits = raw.replace(/\D/g, '');
      const value = Number(digits);

      if (isHeader && !hasThousandSeparator && digits.length === 5) {
        continue; // skip postal codes
      }
      if (
        digits.length >= 10 &&
        (digits.startsWith('08') || digits.startsWith('62'))
      ) {
        continue;
      }

      if (
        Number.isSafeInteger(value) &&
        value >= 500 &&
        value <= 1_000_000_000
      ) {
        if (!seen.has(value)) {
          seen.add(value);
          candidates.push(value);
        }
      }
    }
  }

  // Sort descending by value
  return candidates.sort((a, b) => b - a);
}

function findTotal(lines: readonly string[]): number | null {
  let best: { amount: number; score: number } | null = null;

  for (const [index, line] of lines.entries()) {
    const isHeader = index < 4 || ADDRESS_OR_HEADER_PATTERN.test(line);

    // Skip address or header lines entirely for Total
    if (isHeader && !TOTAL_RULES.some((r) => r.pattern.test(line))) {
      continue;
    }

    // Skip lines with only Cash/Kembali (unless Total rule also matches)
    if (
      EXCLUDED_TOTAL_PREFIX.test(line) &&
      !TOTAL_RULES.some((r) => r.pattern.test(line))
    ) {
      continue;
    }

    for (const rule of TOTAL_RULES) {
      if (!rule.pattern.test(line)) {
        continue;
      }

      // Check amount on the same line
      let lineToParse = line;
      const excludeIdx = line.search(EXCLUDED_TOTAL_PREFIX);
      if (excludeIdx > 0 && line.search(rule.pattern) < excludeIdx) {
        lineToParse = line.slice(0, excludeIdx);
      }

      let amount = parseAmount(lineToParse, isHeader);

      // If no amount on this line, look ahead up to 2 lines
      if (amount === null) {
        for (
          let offset = 1;
          offset <= 2 && index + offset < lines.length;
          offset++
        ) {
          const lookaheadLine = lines[index + offset]!;
          if (
            EXCLUDED_TOTAL_PREFIX.test(lookaheadLine) &&
            !TOTAL_RULES.some((r) => r.pattern.test(lookaheadLine))
          ) {
            break;
          }
          const lookaheadAmount = parseAmount(lookaheadLine, false);
          if (lookaheadAmount !== null) {
            amount = lookaheadAmount;
            break;
          }
        }
      }

      if (amount === null) {
        continue;
      }

      // Zone weighting: higher score for bottom half of the receipt
      const positionWeight = (index / Math.max(lines.length, 1)) * 30;
      const candidate = {
        amount,
        score: rule.score + positionWeight,
      };

      if (!best || candidate.score > best.score) {
        best = candidate;
      }
      break;
    }
  }

  // Fallback: If no labeled total found, check the bottom 40% of the receipt for largest non-cash amount
  if (!best) {
    const startIdx = Math.floor(lines.length * 0.5);
    const bottomLines = lines.slice(startIdx);
    for (let i = bottomLines.length - 1; i >= 0; i--) {
      const line = bottomLines[i]!;
      if (
        EXCLUDED_TOTAL_PREFIX.test(line) ||
        ADDRESS_OR_HEADER_PATTERN.test(line)
      ) {
        continue;
      }
      const amount = parseAmount(line, false);
      if (amount !== null && amount >= 1_000) {
        return amount;
      }
    }
  }

  return best?.amount ?? null;
}

function formatDate(year: number, month: number, day: number): string | null {
  const y = year < 100 ? 2000 + year : year;
  const value = `${String(y).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return isLocalDate(value) ? value : null;
}

function findDate(lines: readonly string[]): string | null {
  for (const line of lines) {
    // 1. Named Month: "10 Aug 2026", "10 Agu 2026", "10-Agustus-2026", "10/08/2026"
    const named =
      /\b(\d{1,2})[-/\s]+([A-Za-z]{3,12})[-/\s]+(20\d{2}|\d{2})\b/i.exec(line);
    if (named && named[1] && named[2] && named[3]) {
      const monthKey = named[2].toLowerCase();
      const month = MONTHS[monthKey] ?? MONTHS[monthKey.slice(0, 3)];
      if (month) {
        const year = Number(named[3]);
        const day = Number(named[1]);
        const value = formatDate(year, month, day);
        if (value) return value;
      }
    }

    // 2. ISO format: YYYY-MM-DD or YYYY/MM/DD
    const iso = /\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/.exec(line);
    if (iso && iso[1] && iso[2] && iso[3]) {
      const value = formatDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
      if (value) return value;
    }

    // 3. Local format: DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
    const local = /\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/.exec(line);
    if (local && local[1] && local[2] && local[3]) {
      const value = formatDate(
        Number(local[3]),
        Number(local[2]),
        Number(local[1]),
      );
      if (value) return value;
    }
  }
  return null;
}

function findMerchant(lines: readonly string[]): string | null {
  const excluded =
    /^(?:\W*(?:THANK\s+YOU|TERIMA\s+KASIH|SELAMAT\s+DATANG|WELCOME)|RECEIPT|STRUK|INVOICE|NOTA|DATE|TANGGAL|TIME|TEL|PHONE|NPWP|CASHIER|KASIR|TOTAL|SUB\s*TOTAL|TAX|PPN|VAT|PB1)\b/i;

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
  const subtotalMinor = findLabeledAmount(lines, SUBTOTAL_PATTERN, /GRAND/i);
  const taxMinor = findLabeledAmount(lines, TAX_PATTERN);
  const candidateAmounts = extractAllCandidates(lines);
  const warnings: ReceiptParseWarning[] = [];

  if (!merchant) warnings.push('merchant_not_found');
  if (!localDate) warnings.push('date_not_found');
  if (totalMinor === null) warnings.push('total_not_found');

  return {
    candidateAmounts,
    localDate,
    merchant,
    subtotalMinor,
    taxMinor,
    totalMinor,
    warnings,
  };
}
