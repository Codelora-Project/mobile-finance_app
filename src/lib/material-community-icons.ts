import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';

export type MaterialCommunityIconName = ComponentProps<
  typeof MaterialCommunityIcons
>['name'];

/**
 * Safely resolves icon names coming from persisted or otherwise dynamic data.
 * Invalid legacy values fall back instead of being passed unchecked to the
 * icon component.
 */
export function resolveMaterialCommunityIconName(
  value: string | null | undefined,
  fallback: MaterialCommunityIconName,
  supportedNames: ReadonlySet<string>,
): MaterialCommunityIconName {
  if (value && supportedNames.has(value as MaterialCommunityIconName)) {
    return value as MaterialCommunityIconName;
  }
  return fallback;
}
