'use client';

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Pie, PieChart, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTokenAmount } from '@/lib/utils/format';
import type { ChainStakingData } from '@/hooks/useMultiChainStaking';
import type { ChartConfig } from '@/components/ui/chart';

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

const CHART_COLOR_CLASSES = [
  'bg-[var(--chart-1)]',
  'bg-[var(--chart-2)]',
  'bg-[var(--chart-3)]',
  'bg-[var(--chart-4)]',
  'bg-[var(--chart-5)]',
];

const CHART_CONFIG: ChartConfig = {
  delegations: { label: 'Delegations' },
};

const sumAmounts = (amounts: string[]): string => {
  const total = amounts.reduce(
    (accumulator, amount) => accumulator + BigInt(amount ?? '0'),
    BigInt(0),
  );
  return total.toString();
};

type MultiChainBreakdownProps = {
  chains: ChainStakingData[];
};

const MultiChainBreakdown = ({ chains }: MultiChainBreakdownProps) => {
  const isLoading = chains.some((chain) => chain.delegationsLoading);

  const chartData = chains.map((chain, index) => {
    const totalStaked = chain.delegations
      ? sumAmounts(chain.delegations.map((delegation) => delegation.amount))
      : '0';

    return {
      name: chain.config.name,
      color: CHART_COLORS[index % CHART_COLORS.length],
      delegations: chain.delegations?.length ?? 0,
      staked: formatTokenAmount(totalStaked, chain.config.stakingToken.decimals, 2),
      symbol: chain.config.stakingToken.symbol,
      logo: chain.config.logo,
    };
  });

  const totalDelegations = chartData.reduce((sum, entry) => sum + entry.delegations, 0);

  const failedChains = chains.filter((chain) => chain.address && chain.delegationsError);
  if (failedChains.length > 0) {
    return <Card><CardHeader><CardTitle>Chain Distribution</CardTitle></CardHeader><CardContent>
      <p role="alert" className="text-sm text-destructive">Staking data unavailable for {failedChains.map((chain) => chain.config.name).join(', ')}. A complete summary cannot be shown.</p>
    </CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chain Distribution</CardTitle>
        <CardDescription>Delegation count by chain</CardDescription>
      </CardHeader>
      <CardContent>
        {(() => {
          if (isLoading) {
            return <Skeleton className="h-[250px] w-full" />;
          }

          if (totalDelegations === 0) {
            return (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                No delegations
              </div>
            );
          }

          return (
            <div className="flex flex-col items-center gap-4">
              <ChartContainer config={CHART_CONFIG} className="h-[200px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={chartData.filter((entry) => entry.delegations > 0)}
                    dataKey="delegations"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                  >
                    {chartData
                      .filter((entry) => entry.delegations > 0)
                      .map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                        />
                      ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="flex flex-col gap-2 w-full">
                {chartData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-3 w-3 rounded-full ${CHART_COLOR_CLASSES[index % CHART_COLOR_CLASSES.length]}`}
                      />
                      <Image
                        src={entry.logo}
                        alt={entry.name}
                        width={16}
                        height={16}
                        className="rounded-full"
                      />
                      <span className="text-sm">{entry.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {entry.staked} {entry.symbol} ({entry.delegations} delegation{entry.delegations !== 1 ? 's' : ''})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
};

export { MultiChainBreakdown };
