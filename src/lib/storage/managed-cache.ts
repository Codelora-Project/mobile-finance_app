import { Directory, File, Paths } from 'expo-file-system';

export const MANAGED_CACHE_DIRECTORY_NAMES = ['exports', 'backups'] as const;

export type ManagedCacheDirectoryName =
  (typeof MANAGED_CACHE_DIRECTORY_NAMES)[number];

export function getManagedCacheDirectory(name: ManagedCacheDirectoryName) {
  return new Directory(Paths.cache, name);
}

export function resetManagedCacheDirectory(name: ManagedCacheDirectoryName) {
  const directory = getManagedCacheDirectory(name);
  if (directory.exists) directory.delete();
  directory.create({ idempotent: true, intermediates: true });
  return directory;
}

export function getManagedCacheSizeBytes(
  names: readonly ManagedCacheDirectoryName[] = MANAGED_CACHE_DIRECTORY_NAMES,
) {
  let sizeBytes = 0;
  for (const name of names) {
    const directory = getManagedCacheDirectory(name);
    if (!directory.exists) continue;
    for (const item of directory.list()) {
      if (item instanceof File && item.exists) sizeBytes += item.size || 0;
    }
  }
  return sizeBytes;
}

export function clearManagedCache(
  names: readonly ManagedCacheDirectoryName[] = MANAGED_CACHE_DIRECTORY_NAMES,
) {
  const freedBytes = getManagedCacheSizeBytes(names);
  for (const name of names) {
    const directory = getManagedCacheDirectory(name);
    if (directory.exists) directory.delete();
  }
  return { freedBytes };
}

export function removeManagedCacheFile(fileUri: string) {
  const cacheRootUri = Paths.cache.uri.endsWith('/')
    ? Paths.cache.uri
    : `${Paths.cache.uri}/`;
  if (!fileUri.startsWith(cacheRootUri)) return false;
  const file = new File(fileUri);
  if (file.exists) file.delete();
  return true;
}
