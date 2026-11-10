'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Pie, PieChart, Cell } from 'recharts';
import { useDelegations } from '@/hooks/useStaking';
import { useChain } from '@/hooks/useChain';
import { formatTokenAmount } from '@/lib/utils/format';
import { Skeleton } from '@/components/ui/skeleton';
import { toAllocationSlices } from '@/features/staking/allocation';
import type { ChartConfig } from '@/components/ui/chart';

const CHART_CONFIG: ChartConfig = {
  basisPoints: { label: 'Share' },
};

// 2 degrees of padding leaves a visible gap between slices on any card surface
const SLICE_GAP_DEGREES = 2;

const formatShare = (basisPoints: number) => {
  return basisPoints === 0 ? '<0.01%' : `${(basisPoints / 100).toFixed(2)}%`;
};

const StakingChart = () => {
  const { config } = useChain();
  const { data: delegations, isLoading, error } = useDelegations();
  const { decimals, symbol } = config.stakingToken;
  const slices = toAllocationSlices(delegations ?? []).map((slice) => ({
    ...slice,
    fill: `var(${slice.colorVar})`,
    amountText: `${formatTokenAmount(slice.amount, decimals, 6)} ${symbol}`,
    shareText: formatShare(slice.basisPoints),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Staking Allocation</CardTitle>
        <CardDescription>Current native staking positions by validator or pool</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-[250px] w-full" /> : error ? (
          <p role="alert" className="text-sm text-destructive">Staking data unavailable: {error.message}</p>
        ) : slices.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">No active delegations</p>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <ChartContainer config={CHART_CONFIG} className="h-[200px] w-full">
              <PieChart>
                <ChartTooltip
                  content={(
                    <ChartTooltipContent
                      hideLabel
                      formatter={(_value, _name, item) => (
                        <span>{item.payload.label}: {item.payload.amountText} ({item.payload.shareText})</span>
                      )}
                    />
                  )}
                />
                <Pie
                  data={slices}
                  dataKey="basisPoints"
                  nameKey="label"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={slices.length > 1 ? SLICE_GAP_DEGREES : 0}
                  stroke="none"
                >
                  {slices.map((slice) => <Cell key={slice.key} fill={slice.fill} />)}
                </Pie>
              </PieChart>
            </ChartContainer>
            <ul className="flex w-full flex-col gap-2">
              {slices.map((slice) => (
                <li key={slice.key} className="flex items-start justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-start gap-2">
                    <span aria-hidden className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: slice.fill }} />
                    <span className="min-w-0 wrap-anywhere font-medium">{slice.label}</span>
                  </span>
                  <span className="shrink-0 text-right text-muted-foreground">
                    {slice.amountText} · {slice.shareText}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export { StakingChart };
