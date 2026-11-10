'use client';

import { mainnet } from 'viem/chains';
import { polygonStakingClient } from '@/lib/chains/polygon/client';
import { useEvmLiquidStaking } from '@/features/liquid-staking/useEvmLiquidStaking';
import { readStpolPosition } from './client';
import { prepareStpolAction } from './actions';

const protocol = { chain: mainnet, client: polygonStakingClient, chainSlug: 'polygon', provider: 'stake-link', readPosition: readStpolPosition, prepare: prepareStpolAction };
export function useStpolStaking() { return useEvmLiquidStaking(protocol); }
