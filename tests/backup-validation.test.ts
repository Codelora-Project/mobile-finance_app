import { describe, expect, it } from '@jest/globals';

import type {
  BackupPayload,
  BackupReceipt,
} from '@/features/backup/backup-types';
import { parseBackupPayload } from '@/features/backup/backup-validation';

function emptyPayload(version: 1 | 2): BackupPayload {
  return {
    app_identifier: 'keuanganku_app',
    app_version: '1.0.0',
    data: {
      app_settings: [],
      categories: [],
      category_budgets: [],
      claim_items: [],
      claims: [],
      goal_transactions: [],
      payment_methods: [],
      receipts: [],
      savings_goals: [],
      transactions: [],
    },
    exported_at: '2026-08-24T00:00:00.000Z',
    summary: {
      budgets_count: 0,
      categories_count: 0,
      claims_count: 0,
      goals_count: 0,
      payment_methods_count: 0,
      transactions_count: 0,
    },
    version,
  };
}

function receipt(fileBase64?: string | null): BackupReceipt {
  return {
    created_at: 1,
    file_base64: fileBase64,
    id: 1,
    mime_type: 'image/jpeg',
    ocr_raw_text: null,
    ocr_status: 'not_processed',
    storage_key: 'receipts/original.jpg',
    subtotal_minor: null,
    tax_minor: null,
    transaction_id: 1,
    updated_at: 1,
  };
}

describe('backup payload validation', () => {
  it('accepts a structurally valid backup', () => {
    const payload = emptyPayload(2);

    expect(parseBackupPayload(JSON.stringify(payload))).toEqual(payload);
  });

  it('accepts the legacy personal_finance_app identifier', () => {
    const payload = {
      ...emptyPayload(2),
      app_identifier: 'personal_finance_app' as const,
    };

    expect(parseBackupPayload(JSON.stringify(payload))).toEqual(payload);
  });

  it('rejects malformed collection rows before database restore', () => {
    const payload = emptyPayload(2) as BackupPayload & {
      data: { transactions: unknown[] };
    };
    payload.data.transactions.push({ amount_minor: '25000', id: 1 });

    expect(() => parseBackupPayload(JSON.stringify(payload))).toThrow(
      /transactions.*baris 1/i,
    );
  });

  it('requires embedded receipt data for V2 but keeps V1 compatibility', () => {
    const versionTwo = emptyPayload(2);
    versionTwo.data.receipts.push(receipt(null));
    expect(() => parseBackupPayload(JSON.stringify(versionTwo))).toThrow(
      /receipts.*baris 1/i,
    );

    const versionOne = emptyPayload(1);
    versionOne.data.receipts.push(receipt());
    expect(parseBackupPayload(JSON.stringify(versionOne)).version).toBe(1);
  });

  it('rejects receipt data that is not valid base64', () => {
    const payload = emptyPayload(2);
    payload.data.receipts.push(receipt('not base64!'));

    expect(() => parseBackupPayload(JSON.stringify(payload))).toThrow(
      /receipts.*baris 1/i,
    );
  });
});
