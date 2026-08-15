import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  buildClaimPdfModel,
  generateClaimPdf,
  getClaimPdfFileName,
  renderClaimPdfHtml,
  shareClaimPdf,
  slugClaimTitle,
} from '@/features/claims/claim-pdf';
import { toLocalDate, getTimezoneOffsetMinutes } from '@/lib/dates';

const mockGetClaim = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockReadReceiptBase64 =
  jest.fn<(...args: unknown[]) => Promise<string | null>>();
const mockPrintToFileAsync =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockIsSharingAvailable = jest.fn<() => Promise<boolean>>();
const mockShareAsync = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockExistingFiles = new Set<string>();

jest.mock('@/features/claims/claim-repository', () => ({
  getClaim: (...args: unknown[]) => mockGetClaim(...args),
}));
jest.mock('@/features/receipts/receipt-storage', () => ({
  readReceiptBase64: (...args: unknown[]) => mockReadReceiptBase64(...args),
}));
jest.mock('expo-print', () => ({
  printToFileAsync: (...args: unknown[]) => mockPrintToFileAsync(...args),
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: () => mockIsSharingAvailable(),
  shareAsync: (...args: unknown[]) => mockShareAsync(...args),
}));
jest.mock('expo-file-system', () => {
  class MockDirectory {
    uri: string;

    constructor(parent: { uri: string }, name: string) {
      this.uri = `${parent.uri}${name}/`;
    }

    create() {}
  }

  class MockFile {
    uri: string;

    constructor(source: string | { uri: string }, name?: string) {
      this.uri =
        typeof source === 'string' ? source : `${source.uri}${name ?? ''}`;
    }

    get exists() {
      return mockExistingFiles.has(this.uri);
    }

    delete() {
      mockExistingFiles.delete(this.uri);
    }

    async move(destination: MockFile) {
      mockExistingFiles.delete(this.uri);
      mockExistingFiles.add(destination.uri);
    }
  }

  return {
    Directory: MockDirectory,
    File: MockFile,
    Paths: { cache: { uri: 'file:///cache/' } },
  };
});

const claim = {
  createdAt: 1,
  currencyCode: 'IDR',
  description: '<script>alert("claim")</script> & travel',
  expenses: [
    {
      amountMinor: 35_000,
      categoryName: 'Travel > Taxi',
      counterparty: 'A&B <Very Long Merchant Name>',
      currencyCode: 'IDR',
      hasReceipt: true,
      id: 1,
      localDate: '2026-08-10',
      note: 'Client "meeting" & toll',
      receipt: {
        mimeType: 'image/jpeg',
        storageKey: 'receipts/taxi.jpg',
      },
    },
    {
      amountMinor: 15_000,
      categoryName: 'Travel',
      counterparty: null,
      currencyCode: 'IDR',
      hasReceipt: false,
      id: 2,
      localDate: '2026-08-15',
      note: null,
      receipt: null,
    },
  ],
  id: 9,
  itemCount: 2,
  periodEnd: '2026-08-15',
  periodMode: 'auto',
  periodStart: '2026-08-10',
  receiptAttachedCount: 1,
  receiptMissingCount: 1,
  reimbursedAt: null,
  rejectedAt: null,
  status: 'submitted',
  submittedAt: 2,
  title: 'Client & Bandung <Trip>',
  totalMinor: 50_000,
  updatedAt: 2,
};

describe('claim PDF pipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExistingFiles.clear();
    mockGetClaim.mockResolvedValue(claim);
    mockReadReceiptBase64.mockResolvedValue('aW1hZ2U=');
    mockIsSharingAvailable.mockResolvedValue(true);
    mockShareAsync.mockResolvedValue(undefined);
    mockPrintToFileAsync.mockImplementation(async () => {
      mockExistingFiles.add('file:///cache/print-output.pdf');
      return { numberOfPages: 2, uri: 'file:///cache/print-output.pdf' };
    });
  });

  it('builds a currency-aware model with attached and missing receipts', async () => {
    const generatedAt = new Date(2026, 7, 14, 12, 0).getTime();
    const generatedDate = toLocalDate(
      generatedAt,
      getTimezoneOffsetMinutes(generatedAt),
    );

    const model = await buildClaimPdfModel({} as never, 9, generatedAt);

    expect(model.title).toBe('Client & Bandung <Trip>');
    expect(model.period).toBe('2026-08-10 – 2026-08-15');
    expect(model.total).toContain('50');
    expect(model.fileName).toBe(
      `expense-claim-client-bandung-trip-${generatedDate}.pdf`,
    );
    expect(model.expenses[0]).toEqual(
      expect.objectContaining({
        receiptDataUri: 'data:image/jpeg;base64,aW1hZ2U=',
        receiptState: 'attached',
      }),
    );
    expect(model.expenses[1]).toEqual(
      expect.objectContaining({ receiptState: 'missing' }),
    );
  });

  it('renders safe HTML with a correct expense table and missing receipt', async () => {
    const html = renderClaimPdfHtml(await buildClaimPdfModel({} as never, 9));

    expect(html).toContain('EXPENSE CLAIM');
    expect(html).toContain('Date</th><th>Description</th><th>Category');
    expect(html).toContain('Client &amp; Bandung &lt;Trip&gt;');
    expect(html).toContain('&lt;script&gt;alert(&quot;claim&quot;)');
    expect(html).not.toContain('<script>alert("claim")</script>');
    expect(html).toContain('A&amp;B &lt;Very Long Merchant Name&gt;');
    expect(html).toContain('Travel &gt; Taxi');
    expect(html).toContain('Receipt not attached');
    expect(html).toContain('data:image/jpeg;base64,aW1hZ2U=');
    expect(html).toContain('overflow-wrap: anywhere');
  });

  it('generates offline into cache/exports using a valid filename', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');

    const generated = await generateClaimPdf({} as never, 9);

    expect(mockPrintToFileAsync).toHaveBeenCalledWith({
      html: expect.stringContaining('EXPENSE CLAIM'),
    });
    expect(generated.numberOfPages).toBe(2);
    expect(generated.uri).toMatch(
      /^file:\/\/\/cache\/exports\/expense-claim-client-bandung-trip-\d{4}-\d{2}-\d{2}\.pdf$/,
    );
    expect(mockExistingFiles.has(generated.uri)).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('opens the native share sheet for the generated local PDF', async () => {
    const generated = await shareClaimPdf({} as never, 9);

    expect(mockShareAsync).toHaveBeenCalledWith(generated.uri, {
      dialogTitle: 'Share expense claim PDF',
      mimeType: 'application/pdf',
      UTI: '.pdf',
    });
  });

  it('maps generate and sharing failures without changing the Claim', async () => {
    const warningSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockPrintToFileAsync.mockRejectedValueOnce(new Error('print failed'));
    await expect(generateClaimPdf({} as never, 9)).rejects.toMatchObject({
      code: 'PDF_GENERATION_FAILED',
    });

    mockIsSharingAvailable.mockResolvedValueOnce(false);
    await expect(shareClaimPdf({} as never, 9)).rejects.toMatchObject({
      code: 'FILE_OPERATION_FAILED',
    });
    expect(mockGetClaim).toHaveBeenCalled();
    warningSpy.mockRestore();
  });

  it('creates safe slugs and deterministic PDF names', () => {
    expect(slugClaimTitle('  Café / Client: Bandung!  ')).toBe(
      'cafe-client-bandung',
    );
    expect(slugClaimTitle('東京')).toBe('claim');
    expect(getClaimPdfFileName('A/B', '2026-08-14')).toBe(
      'expense-claim-a-b-2026-08-14.pdf',
    );
  });
});
