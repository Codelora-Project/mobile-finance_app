import { clearManagedCache } from '@/lib/storage/managed-cache';

export function clearSensitiveCache() {
  clearManagedCache();
}
