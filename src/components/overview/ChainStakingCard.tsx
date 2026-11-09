'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowRight } from 'lucide-react';
import { formatTokenAmount, formatRewardDisplay } from '@/lib/utils/format';
import type { ChainStakingData } from '@/hooks/useMultiChainStaking';

const sumAmounts = (amounts: string[]): string => {
  const total = amounts.reduce(
    (accumulator, amount) => accumulator + BigInt(amount ?? '0'),
    BigInt(0),
  );
  return total.toString();
};

type ChainStakingCardProps = {
  chain: ChainStakingData;
};

const ChainStakingCard = ({ chain }: ChainStakingCardProps) => {
  const { config, delegations, rewards, unbonding, balance } = chain;
  const { decimals, symbol } = config.stakingToken;

  const totalStaked = delegations
    ? sumAmounts(delegations.map((delegation) => delegation.amount))
    : '0';

  const totalUnbonding = unbonding
    ? sumAmounts(unbonding.map((entry) => entry.amount))
    : '0';

  const rewardDisplay = formatRewardDisplay(rewards?.total ?? '0', decimals, symbol);
  const separateRewards = rewards?.tokens?.length
    ? rewards.tokens.map((coin) => `${formatTokenAmount(coin.amount, coin.decimals, 4)} ${coin.symbol}`).join(' + ')
    : null;
  const formattedApy = chain.apy !== null ? `${(chain.apy * 100).toFixed(2)}%` : '-';

  const delegationCount = delegations?.length ?? 0;

  const statItems = [
    { label: 'APY', value: formattedApy, loading: chain.apyLoading, suffix: '' },
    { label: config.slug === 'cardano' ? 'Delegated (liquid)' : 'Staked', value: delegations === undefined ? '-' : formatTokenAmount(totalStaked, decimals, 4), loading: chain.delegationsLoading, suffix: symbol },
    { label: 'Available', value: balance === undefined ? '-' : formatTokenAmount(balance, decimals, 4), loading: chain.balanceLoading, suffix: symbol },
    { label: 'Rewards', value: rewards === undefined ? '-' : separateRewards ?? rewardDisplay.value, loading: chain.rewardsLoading, suffix: separateRewards ? '' : rewardDisplay.unit, suffixTooltip: separateRewards ? null : rewardDisplay.tooltip },
    { label: 'Unbonding', value: unbonding === undefined ? '-' : formatTokenAmount(totalUnbonding, decimals, 4), loading: chain.unbondingLoading, suffix: symbol },
  ];

  return (
    <Card className="px-5 py-3">
      <div className="flex items-center gap-8">
        {/* Chain identity */}
        <div className="flex items-center gap-2.5 min-w-[120px]">
          <Image
            src={config.logo}
            alt={config.name}
            width={28}
            height={28}
            className="rounded-full"
          />
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight">{config.name}</span>
            {!chain.delegationsLoading && delegations !== undefined && (
              <span className="text-[11px] text-muted-foreground leading-tight">
                {delegationCount} delegation{delegationCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Stats row */}
        {!chain.address ? (
          <p className="flex-1 text-sm text-muted-foreground text-center">
            Wallet not connected for this chain
          </p>
        ) : (
          <div className="flex flex-1 items-center gap-8">
            {statItems.map((stat) => (
              <div key={stat.label} className="flex flex-col items-start min-w-0">
                <span className="text-[11px] text-muted-foreground leading-tight">{stat.label}</span>
                {stat.loading ? (
                  <Skeleton className="h-4 w-14 mt-0.5" />
                ) : (
                  <span className="text-sm font-medium truncate leading-tight">
                    {stat.value}
                    {stat.suffix && (
                      <>
                        {' '}
                        {stat.suffixTooltip ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-[11px] font-normal text-muted-foreground cursor-help underline decoration-dotted underline-offset-2">
                                {stat.suffix}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{stat.suffixTooltip}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-[11px] font-normal text-muted-foreground">
                            {stat.suffix}
                          </span>
                        )}
                      </>
                    )}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Manage button */}
        <Link href={`/stake/${config.slug}`} className="shrink-0">
          <Button variant="outline" size="sm" className="gap-1">
            Manage <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </Card>
  );
};

export { ChainStakingCard };
