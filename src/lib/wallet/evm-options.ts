import type { EvmWalletOption } from '@/lib/chains/types';

const METAMASK_OPTION: EvmWalletOption = {
  id: 'metamask',
  label: 'MetaMask',
  icon: '/wallets/metamask.svg',
  downloadUrl: 'https://metamask.io/download/',
  connectorId: 'metaMaskSDK',
  injectedFlag: 'isMetaMask',
};

const WALLETCONNECT_OPTION: EvmWalletOption = {
  id: 'walletconnect',
  label: 'WalletConnect',
  icon: '/wallets/walletconnect.svg',
  downloadUrl: 'https://walletconnect.com/',
  connectorId: 'walletConnect',
};

// connectorId values are the wagmi connector ids created by the wallets registered in evmProvider
const RABBY_OPTION: EvmWalletOption = {
  id: 'rabby',
  label: 'Rabby Wallet',
  icon: '/wallets/rabby.svg',
  downloadUrl: 'https://rabby.io/',
  connectorId: 'rabby',
  injectedFlag: 'isRabby',
};

const COINBASE_OPTION: EvmWalletOption = {
  id: 'coinbase',
  label: 'Coinbase Wallet',
  icon: '/wallets/coinbase.svg',
  downloadUrl: 'https://www.coinbase.com/wallet/downloads',
  connectorId: 'coinbaseWalletSDK',
  injectedFlag: 'isCoinbaseWallet',
};

const COMPASS_OPTION: EvmWalletOption = {
  id: 'compass',
  label: 'Compass Wallet',
  icon: '/wallets/compass.svg',
  downloadUrl: 'https://compasswallet.io/download',
  connectorId: 'compass',
  injectedFlag: 'compassEvm',
};

const KAIA_WALLET_OPTION: EvmWalletOption = {
  id: 'kaia',
  label: 'Kaia Wallet',
  icon: '/wallets/kaia-wallet.svg',
  downloadUrl: 'https://www.kaiawallet.io/',
  connectorId: 'kaia',
  injectedFlag: 'klaytn',
};

// MetaMask stays first as the common default; WalletConnect stays last as the mobile fallback
const withChainWallets = (...chainWallets: EvmWalletOption[]): EvmWalletOption[] => [
  METAMASK_OPTION,
  ...chainWallets,
  WALLETCONNECT_OPTION,
];

const EVM_WALLET_OPTIONS = withChainWallets();
const ETHEREUM_WALLET_OPTIONS = withChainWallets(RABBY_OPTION, COINBASE_OPTION);
const SONIC_WALLET_OPTIONS = withChainWallets(RABBY_OPTION);
const SEI_WALLET_OPTIONS = withChainWallets(COMPASS_OPTION);
const KAIA_WALLET_OPTIONS = withChainWallets(KAIA_WALLET_OPTION);

export {
  EVM_WALLET_OPTIONS,
  ETHEREUM_WALLET_OPTIONS,
  SONIC_WALLET_OPTIONS,
  SEI_WALLET_OPTIONS,
  KAIA_WALLET_OPTIONS,
};
