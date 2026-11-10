'use client';

import { kaia } from 'viem/chains';
import { useEvmLiquidStaking } from '@/features/liquid-staking/useEvmLiquidStaking';
import { lairClient, readLairPosition } from './client';
import { prepareLairAction } from './actions';

const protocol = { chain: kaia, client: lairClient, chainSlug: 'kaia', provider: 'lair', readPosition: readLairPosition, prepare: prepareLairAction };
export function useLairStaking() { return useEvmLiquidStaking(protocol); }
