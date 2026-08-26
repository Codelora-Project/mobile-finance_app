import type { SQLiteDatabase } from 'expo-sqlite';

const transactionShapeChecks = `
  SELECT CASE
    WHEN NEW.type = 'transfer' AND (
      NEW.payment_method_id IS NULL OR
      NEW.transfer_to_payment_method_id IS NULL OR
      NEW.payment_method_id = NEW.transfer_to_payment_method_id
    ) THEN RAISE(ABORT, 'transaction_transfer_wallets_invalid')
    WHEN NEW.type <> 'transfer' AND (
      NEW.transfer_to_payment_method_id IS NOT NULL OR
      COALESCE(NEW.transfer_fee_minor, 0) <> 0 OR
      NEW.transfer_fee_category_id IS NOT NULL OR
      NEW.transfer_fee_note IS NOT NULL
    ) THEN RAISE(ABORT, 'transaction_non_transfer_fields_invalid')
    WHEN NOT EXISTS (
      SELECT 1
      FROM categories category
      WHERE category.id = NEW.category_id
        AND (
          (NEW.type = 'expense' AND category.type = 'expense') OR
          (NEW.type = 'income' AND category.type = 'income') OR
          (NEW.type = 'transfer' AND category.system_key = 'wallet_transfer')
        )
    ) THEN RAISE(ABORT, 'transaction_category_type_invalid')
    WHEN NEW.transfer_fee_category_id IS NOT NULL AND NOT EXISTS (
      SELECT 1
      FROM categories fee_category
      WHERE fee_category.id = NEW.transfer_fee_category_id
        AND fee_category.type = 'expense'
    ) THEN RAISE(ABORT, 'transaction_transfer_fee_category_invalid')
  END;
`;

export const enforceTransactionShapeMigration = {
  name: '008_enforce_transaction_shape',
  version: 8,
  async up(database: SQLiteDatabase) {
    await database.execAsync(`
      CREATE TRIGGER transactions_shape_before_insert
      BEFORE INSERT ON transactions
      FOR EACH ROW
      BEGIN
        ${transactionShapeChecks}
      END;

      CREATE TRIGGER transactions_shape_before_update
      BEFORE UPDATE OF
        type,
        category_id,
        payment_method_id,
        transfer_to_payment_method_id,
        transfer_fee_minor,
        transfer_fee_category_id,
        transfer_fee_note
      ON transactions
      FOR EACH ROW
      BEGIN
        ${transactionShapeChecks}
      END;

      CREATE TRIGGER receipts_expense_only_before_insert
      BEFORE INSERT ON receipts
      FOR EACH ROW
      WHEN NOT EXISTS (
        SELECT 1 FROM transactions
        WHERE id = NEW.transaction_id AND type = 'expense'
      )
      BEGIN
        SELECT RAISE(ABORT, 'receipt_transaction_type_invalid');
      END;

      CREATE TRIGGER receipts_expense_only_before_update
      BEFORE UPDATE OF transaction_id ON receipts
      FOR EACH ROW
      WHEN NOT EXISTS (
        SELECT 1 FROM transactions
        WHERE id = NEW.transaction_id AND type = 'expense'
      )
      BEGIN
        SELECT RAISE(ABORT, 'receipt_transaction_type_invalid');
      END;
    `);
  },
} as const;
