'use client';

import { sonic } from 'viem/chains';
import { useEvmLiquidStaking } from '@/features/liquid-staking/useEvmLiquidStaking';
import { sonicClient } from '@/lib/chains/sonic/client';
import { readBeetsPosition } from './client';
import { prepareBeetsAction } from './actions';

export function useBeetsStaking() {
  return useEvmLiquidStaking({ chain: sonic, client: sonicClient, chainSlug: 'sonic', provider: 'beets', readPosition: readBeetsPosition, prepare: prepareBeetsAction });
}
