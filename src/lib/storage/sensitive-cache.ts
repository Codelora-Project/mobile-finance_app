import { Directory, Paths } from 'expo-file-system';

const SENSITIVE_CACHE_DIRECTORIES = ['exports', 'backups'] as const;

export function clearSensitiveCache() {
  for (const name of SENSITIVE_CACHE_DIRECTORIES) {
    const directory = new Directory(Paths.cache, name);
    if (directory.exists) directory.delete();
  }
}
