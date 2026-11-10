'use client';

import { avalanche } from 'viem/chains';
import { useEvmLiquidStaking } from '@/features/liquid-staking/useEvmLiquidStaking';
import { benqiClient } from './client';
import { readBenqiPosition } from './client';
import { prepareBenqiAction } from './actions';

export function useBenqiStaking() {
  return useEvmLiquidStaking({ chain: avalanche, client: benqiClient, chainSlug: 'avalanche', provider: 'benqi', readPosition: readBenqiPosition, prepare: prepareBenqiAction });
}
