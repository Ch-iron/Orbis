'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Pie, PieChart, Cell } from 'recharts';
import { useDelegations } from '@/hooks/useStaking';
import { useChain } from '@/hooks/useChain';
import { formatTokenAmount } from '@/lib/utils/format';
import { Skeleton } from '@/components/ui/skeleton';
import type { ChartConfig } from '@/components/ui/chart';

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

const CHART_CONFIG: ChartConfig = {
  amount: { label: 'Amount' },
};

const ChainBreakdown = () => {
  const { config } = useChain();
  const { data: delegations, isLoading } = useDelegations();

  const totalStaked = delegations
    ? delegations
        .reduce(
          (accumulator, delegation) => accumulator + BigInt(delegation.amount || '0'),
          BigInt(0),
        )
        .toString()
    : '0';

  const formatted = formatTokenAmount(totalStaked, config.stakingToken.decimals, 2);

  const chartData = [
    { name: config.name, amount: Number(formatted.replace(/,/g, '')) },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chain Distribution</CardTitle>
        <CardDescription>Staking allocation by chain</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[250px] w-full" />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <ChartContainer config={CHART_CONFIG} className="h-[200px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie
                  data={chartData}
                  dataKey="amount"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                >
                  {chartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-chart-1" />
              <span className="text-sm">
                {config.name}: {formatted} {config.stakingToken.symbol}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export { ChainBreakdown };
