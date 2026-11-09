import type { EvmWalletOption } from '@/lib/chains/types';

export const EVM_WALLET_OPTIONS: EvmWalletOption[] = [
  {
    id: 'metamask',
    label: 'MetaMask',
    icon: '/wallets/metamask.svg',
    downloadUrl: 'https://metamask.io/download/',
    connectorId: 'metaMaskSDK',
    injectedFlag: 'isMetaMask',
  },
  {
    id: 'walletconnect',
    label: 'WalletConnect',
    icon: '/wallets/walletconnect.svg',
    downloadUrl: 'https://walletconnect.com/',
    connectorId: 'walletConnect',
  },
];
