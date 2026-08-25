import type { MaterialCommunityIconName } from '@/lib/material-community-icons';

export const GOAL_ICONS: Readonly<Record<string, MaterialCommunityIconName>> = {
  car: 'car',
  emergency: 'shield-star',
  gadget: 'cellphone',
  gift: 'gift',
  home: 'home-heart',
  laptop: 'laptop',
  piggy: 'piggy-bank',
  shopping: 'shopping',
  target: 'target',
  travel: 'airplane',
};

export function getGoalIconName(
  iconKey: string,
  fallback: MaterialCommunityIconName = 'target',
): MaterialCommunityIconName {
  return GOAL_ICONS[iconKey] ?? fallback;
}
