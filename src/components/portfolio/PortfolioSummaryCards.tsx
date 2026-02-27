'use client';

import { useDelegations, useBalance, useRewards, useUnbonding } from '@/hooks/useStaking';
import { useChain } from '@/hooks/useChain';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTokenAmount } from '@/lib/utils/format';
import { Coins, Wallet, Timer, TrendingUp, Gift } from 'lucide-react';
import { useStakingApy } from '@/hooks/useStakingApy';
import { useChainStore } from '@/stores/chainStore';
import { CHAIN_REGISTRY } from '@/lib/chains/registry';

type IconProps = {
  className?: string;
};

// Sum raw string amounts using BigInt to handle large numbers (e.g. 18 decimals)
const sumAmounts = (amounts: string[]): string => {
  const total = amounts.reduce(
    (accumulator, amount) => accumulator + BigInt(amount || '0'),
    BigInt(0),
  );
  return total.toString();
};

type SummaryCardData = {
  label: string;
  value: string;
  icon: React.ComponentType<IconProps>;
  loading: boolean;
  suffix?: string;
};

const PortfolioSummaryCards = () => {
  const { config } = useChain();
  const { data: delegations, isLoading: delegationsLoading } = useDelegations();
  const { data: balance, isLoading: balanceLoading } = useBalance();
  const { data: rewards, isLoading: rewardsLoading } = useRewards();
  const { data: unbondingEntries, isLoading: unbondingLoading } = useUnbonding();
  const { apy, isLoading: apyLoading } = useStakingApy();
  const selectedChainSlug = useChainStore((state) => state.selectedChainSlug);
  const chainConfig = CHAIN_REGISTRY[selectedChainSlug];
  const hasApyEndpoint = !!chainConfig?.stakingApyEndpoint;

  const totalStaked = delegations
    ? sumAmounts(delegations.map((delegation) => delegation.amount))
    : '0';
  const totalUnbonding = unbondingEntries
    ? sumAmounts(unbondingEntries.map((entry) => entry.amount))
    : '0';
  const { decimals, symbol } = config.stakingToken;

  const formattedApy = apy !== null ? `${(apy * 100).toFixed(2)}%` : '-';

  const cards: SummaryCardData[] = [
    ...(hasApyEndpoint
      ? [
          {
            label: 'Network Staking APY',
            value: formattedApy,
            icon: TrendingUp,
            loading: apyLoading,
            suffix: '',
          },
        ]
      : []),
    {
      label: 'Total Staked',
      value: formatTokenAmount(totalStaked, decimals, 4),
      icon: Coins,
      loading: delegationsLoading,
    },
    {
      label: 'Available Balance',
      value: formatTokenAmount(balance ?? '0', decimals, 4),
      icon: Wallet,
      loading: balanceLoading,
    },
    {
      label: 'Pending Rewards',
      value: formatTokenAmount(rewards?.total ?? '0', decimals, 4),
      icon: Gift,
      loading: rewardsLoading,
    },
    {
      label: 'Unbonding',
      value: formatTokenAmount(totalUnbonding, decimals, 4),
      icon: Timer,
      loading: unbondingLoading,
    },
  ];

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${hasApyEndpoint ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4`}>
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.label}
            </CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {card.loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">
                {card.value}
                {(card.suffix ?? symbol) && (
                  <>
                    {' '}
                    <span className="text-sm font-normal text-muted-foreground">
                      {card.suffix ?? symbol}
                    </span>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export { PortfolioSummaryCards };
