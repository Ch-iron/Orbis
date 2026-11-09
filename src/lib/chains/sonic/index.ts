import type { ChainConfig } from '../types';
import { EVM_WALLET_OPTIONS } from '@/lib/wallet/evm-options';
import { createSonicAdapter } from './adapter';

export const SONIC_CONFIG: ChainConfig = {
  id: 'sonic-mainnet', slug: 'sonic', name: 'Sonic', type: 'evm', logo: '/chains/sonic.svg',
  rpc: 'https://rpc.soniclabs.com', lcd: '', explorer: 'https://sonicscan.org',
  stakingToken: { denom: 'wei', decimals: 18, symbol: 'S', coingeckoId: 'sonic-3' },
  unbondingDays: null, evmChainId: 146, evmRpc: 'https://rpc.soniclabs.com', evmWalletOptions: EVM_WALLET_OPTIONS,
  txHistoryExternalUrl: (address) => `https://sonicscan.org/address/${address}`,
  createAdapter: createSonicAdapter,
  fetchApy: async () => null,
};
