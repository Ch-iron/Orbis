'use client';

import { useChainStore } from '@/stores/chainStore';
import { CHAIN_REGISTRY } from '@/lib/chains/registry';
import { useStakingApy } from '@/hooks/useStakingApy';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const NetworkApyCard = () => {
  const selectedChainSlug = useChainStore((state) => state.selectedChainSlug);
  const chainConfig = CHAIN_REGISTRY[selectedChainSlug];
  const { apy, isLoading } = useStakingApy();

  if (!chainConfig?.stakingApyEndpoint) {
    return null;
  }

  const formattedApy = apy !== null ? `${(apy * 100).toFixed(2)}%` : null;

  return (
    <Card className='w-fit'>
      <CardContent className='flex items-center gap-3'>
        <TrendingUp className='h-5 w-5 text-green-500' />
        <div className='flex flex-col'>
          <span className='text-sm text-muted-foreground'>
            Network Staking APY
          </span>
          {isLoading ? (
            <Skeleton className='h-6 w-20' />
          ) : (
            <span className='text-lg font-semibold'>{formattedApy ?? '-'}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export { NetworkApyCard };
