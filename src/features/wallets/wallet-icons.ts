import type { AccountType, Wallet } from '@/features/wallets/wallet-types';
import {
  resolveMaterialCommunityIconName,
  type MaterialCommunityIconName,
} from '@/lib/material-community-icons';

const DEFAULT_WALLET_ICONS: Readonly<
  Record<AccountType, MaterialCommunityIconName>
> = {
  bank: 'bank',
  cash: 'cash',
  credit_card: 'credit-card',
  ewallet: 'cellphone',
  investment: 'trending-up',
  other: 'wallet',
};

const SUPPORTED_WALLET_ICONS = new Set<string>([
  'bank',
  'cash',
  'cellphone',
  'credit-card',
  'safe',
  'trending-up',
  'wallet',
]);

export function getWalletIconName(
  wallet: Pick<Wallet, 'accountType' | 'iconKey'>,
): MaterialCommunityIconName {
  return resolveMaterialCommunityIconName(
    wallet.iconKey,
    DEFAULT_WALLET_ICONS[wallet.accountType],
    SUPPORTED_WALLET_ICONS,
  );
}
