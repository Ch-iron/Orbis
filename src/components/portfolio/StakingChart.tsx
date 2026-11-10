'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useDelegations } from '@/hooks/useStaking';
import { useChain } from '@/hooks/useChain';
import { formatTokenAmount } from '@/lib/utils/format';
import { Skeleton } from '@/components/ui/skeleton';

const StakingChart = () => {
  const { config } = useChain();
  const { data: delegations, isLoading, error } = useDelegations();
  const positions = (delegations ?? []).filter((position) => BigInt(position.amount) > BigInt(0));
  const total = positions.reduce((sum, position) => sum + BigInt(position.amount), BigInt(0));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Staking Allocation</CardTitle>
        <CardDescription>Current native staking positions by validator or pool</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-[200px] w-full" /> : error ? (
          <p role="alert" className="text-sm text-destructive">Staking data unavailable: {error.message}</p>
        ) : positions.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">No active delegations</p>
        ) : (
          <ul className="max-h-[250px] space-y-4 overflow-y-auto">
            {positions.map((position, index) => {
              const share = Number(BigInt(position.amount) * BigInt(10000) / total) / 100;
              const name = position.validatorName || position.validatorAddress;
              return <li key={`${position.validatorAddress}:${index}`} className="space-y-1">
                <div className="flex flex-wrap justify-between gap-2 text-sm">
                  <span className="min-w-0 break-all font-medium">{name}</span>
                  <span>{formatTokenAmount(position.amount, config.stakingToken.decimals, 6)} {config.stakingToken.symbol}</span>
                </div>
                <progress className="h-2 w-full accent-primary" value={share} max={100} aria-label={`${name} allocation`} />
                <p className="text-xs text-muted-foreground">{share === 0 ? '<0.01' : share.toFixed(2)}%</p>
              </li>;
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export { StakingChart };
