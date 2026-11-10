'use client';

import { iotex } from 'viem/chains';
import { useEvmLiquidStaking } from '@/features/liquid-staking/useEvmLiquidStaking';
import { iotexClient } from '@/lib/chains/iotex/client';
import { readBedrockPosition } from './client';
import { prepareBedrockAction } from './actions';

export function useBedrockStaking() {
  return useEvmLiquidStaking({ chain: iotex, client: iotexClient, chainSlug: 'iotex', provider: 'bedrock', readPosition: readBedrockPosition, prepare: prepareBedrockAction });
}
