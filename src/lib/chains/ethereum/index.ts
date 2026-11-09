import type { ChainConfig } from '../types';
import { EVM_WALLET_OPTIONS } from '@/lib/wallet/evm-options';
import { createEthereumAdapter } from './adapter';

export const ETHEREUM_CONFIG: ChainConfig = {
  id: 'ethereum-mainnet', slug: 'ethereum', name: 'Ethereum', type: 'evm',
  logo: '/chains/ethereum.png',
  rpc: 'https://ethereum-rpc.publicnode.com', lcd: '', explorer: 'https://etherscan.io',
  stakingToken: { denom: 'wei', decimals: 18, symbol: 'ETH', coingeckoId: 'ethereum' },
  unbondingDays: null,
  evmChainId: 1, evmRpc: 'https://ethereum-rpc.publicnode.com',
  evmWalletOptions: EVM_WALLET_OPTIONS,
  txHistoryExternalUrl: (address) => `https://etherscan.io/address/${address}`,
  createAdapter: createEthereumAdapter,
  // There is no single yield across independently selected liquid staking services.
  fetchApy: async () => null,
};
