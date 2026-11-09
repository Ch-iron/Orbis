'use client';

import { useDelegations, useBalance, useRewards, useUnbonding } from '@/hooks/useStaking';
import { useChain } from '@/hooks/useChain';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatTokenAmount, formatRewardDisplay } from '@/lib/utils/format';
import { Coins, Wallet, Timer, TrendingUp, Gift } from 'lucide-react';
import { useStakingApy } from '@/hooks/useStakingApy';

type IconProps = {
  className?: string;
};

// Sum raw string amounts using BigInt to handle large numbers (e.g. 18 decimals)
const sumAmounts = (amounts: string[]): string => {
  const total = amounts.reduce(
    (accumulator, amount) => accumulator + BigInt(amount ?? '0'),
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
  suffixTooltip?: string | null;
};

const PortfolioSummaryCards = () => {
  const { config } = useChain();
  const { data: delegations, isLoading: delegationsLoading } = useDelegations();
  const { data: balance, isLoading: balanceLoading } = useBalance();
  const { data: rewards, isLoading: rewardsLoading } = useRewards();
  const { data: unbondingEntries, isLoading: unbondingLoading } = useUnbonding();
  const { apy, isLoading: apyLoading } = useStakingApy();

  const totalStaked = delegations
    ? sumAmounts(delegations.map((delegation) => delegation.amount))
    : '0';
  const totalUnbonding = unbondingEntries
    ? sumAmounts(unbondingEntries.map((entry) => entry.amount))
    : '0';
  const { decimals, symbol } = config.stakingToken;
  const rewardDisplay = formatRewardDisplay(rewards?.total ?? '0', decimals, symbol);

  const formattedApy = apy !== null ? `${(apy * 100).toFixed(2)}%` : '-';

  const cards: SummaryCardData[] = [
    {
      label: 'Network Staking APY',
      value: formattedApy,
      icon: TrendingUp,
      loading: apyLoading,
      suffix: '',
    },
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
      value: rewardDisplay.value,
      icon: Gift,
      loading: rewardsLoading,
      suffix: rewardDisplay.unit,
      suffixTooltip: rewardDisplay.tooltip,
    },
    {
      label: 'Unbonding',
      value: formatTokenAmount(totalUnbonding, decimals, 4),
      icon: Timer,
      loading: unbondingLoading,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                    {card.suffixTooltip ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-sm font-normal text-muted-foreground cursor-help underline decoration-dotted underline-offset-2">
                            {card.suffix}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{card.suffixTooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-sm font-normal text-muted-foreground">
                        {card.suffix ?? symbol}
                      </span>
                    )}
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
