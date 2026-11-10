'use client';

import { useEffect } from 'react';
import { useChainStore } from '@/stores/chainStore';
import { CHAIN_REGISTRY } from '@/lib/chains/registry';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LiquidStakingView } from '@/features/liquid-staking/LiquidStakingView';
import { LiquidStakingAvailability } from '@/features/liquid-staking/LiquidStakingAvailability';
import { hasLiquidStaking } from '@/features/liquid-staking/availability';
import { PoolStakingView } from './PoolStakingView';

export function StakingView({ chainId }: { chainId: string }) {
  const selectedChain = useChainStore((state) => state.selectedChainSlug);
  const setSelectedChain = useChainStore((state) => state.setSelectedChainSlug);
  const config = CHAIN_REGISTRY[chainId];

  useEffect(() => { if (config) setSelectedChain(chainId); }, [chainId, config, setSelectedChain]);

  if (!config) return <p role="alert">Unsupported staking chain.</p>;
  if (selectedChain !== chainId) return <p role="status">Loading {config.name} staking…</p>;
  if (!hasLiquidStaking(chainId)) return <div key={chainId}><LiquidStakingAvailability chainId={chainId} /><PoolStakingView chainId={chainId} /></div>;

  return (
    <Tabs key={chainId} defaultValue={chainId === 'ethereum' ? 'liquid' : 'pool'}>
      <TabsList className="mb-4">
        {chainId !== 'ethereum' && <TabsTrigger value="pool">Pool Staking</TabsTrigger>}
        <TabsTrigger value="liquid">Liquid Staking</TabsTrigger>
      </TabsList>
      {chainId !== 'ethereum' && <TabsContent value="pool" forceMount className="data-[state=inactive]:hidden"><PoolStakingView chainId={chainId} /></TabsContent>}
      <TabsContent value="liquid" forceMount className="data-[state=inactive]:hidden">
        {chainId === 'ethereum' && <p className="mb-4 text-sm text-muted-foreground">Ethereum does not support native delegation to an existing validator. Choose a liquid staking pool below.</p>}
        <LiquidStakingView chainId={chainId} />
      </TabsContent>
    </Tabs>
  );
}
