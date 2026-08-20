/**
 * Stable public facade for transaction persistence.
 *
 * Consumers import from this module while implementation responsibilities are
 * split across read, list-query, validation, and write modules.
 */
export * from '@/features/transactions/transaction-write-service';
