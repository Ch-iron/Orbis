import type { ChainConfig } from '../types';
import { EVM_WALLET_OPTIONS } from '@/lib/wallet/evm-options';
import { createIotexAdapter } from './adapter';
export const IOTEX_CONFIG: ChainConfig = {
  id: 'iotex-mainnet', slug: 'iotex', name: 'IoTeX', type: 'evm', logo: '/chains/iotex.svg',
  rpc: 'https://babel-api.mainnet.iotex.io', lcd: '', explorer: 'https://iotexscan.io',
  stakingToken: { denom: 'rau', decimals: 18, symbol: 'IOTX', coingeckoId: 'iotex' },
  unbondingDays: 3, evmChainId: 4689, evmRpc: 'https://babel-api.mainnet.iotex.io', evmWalletOptions: EVM_WALLET_OPTIONS,
  txHistoryExternalUrl: (address) => `https://iotexscan.io/address/${address}`,
  createAdapter: createIotexAdapter, fetchApy: async () => null,
};
