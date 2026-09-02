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

export const walletBrandColors = {
  bca: '#0066AE',
  cash: '#10B981',
  gopay: '#00AED6',
} as const;

export function getWalletIconName(
  wallet: Pick<Wallet, 'accountType' | 'iconKey'>,
): MaterialCommunityIconName {
  return resolveMaterialCommunityIconName(
    wallet.iconKey,
    DEFAULT_WALLET_ICONS[wallet.accountType],
    SUPPORTED_WALLET_ICONS,
  );
}

export function getWalletBrandColor(
  wallet: Pick<Wallet, 'color' | 'name' | 'accountType'>,
): string {
  if (wallet.color) return wallet.color;
  const name = wallet.name.toLowerCase();
  if (name.includes('bca')) return walletBrandColors.bca;
  if (name.includes('mandiri')) return '#003D79';
  if (name.includes('bni')) return '#F15A24';
  if (name.includes('bri')) return '#00529C';
  if (name.includes('jago')) return '#FF6B00';
  if (name.includes('jenius')) return '#00A3E0';
  if (name.includes('gopay')) return walletBrandColors.gopay;
  if (name.includes('ovo')) return '#4C2A86';
  if (name.includes('dana')) return '#118EEA';
  if (name.includes('shopee')) return '#EE4D2D';
  if (name.includes('tunai') || name.includes('cash'))
    return walletBrandColors.cash;
  if (
    name.includes('bibit') ||
    name.includes('reksa') ||
    name.includes('saham')
  )
    return '#8B5CF6';

  switch (wallet.accountType) {
    case 'cash':
      return walletBrandColors.cash;
    case 'bank':
      return '#2563EB';
    case 'ewallet':
      return '#06B6D4';
    case 'credit_card':
      return '#EC4899';
    case 'investment':
      return '#8B5CF6';
    default:
      return '#64748B';
  }
}
