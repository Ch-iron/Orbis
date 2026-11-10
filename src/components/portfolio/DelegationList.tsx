'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useDelegations } from '@/hooks/useStaking';
import { useChain } from '@/hooks/useChain';
import { formatTokenAmount, formatRewardDisplay } from '@/lib/utils/format';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useChainStore } from '@/stores/chainStore';

const DelegationList = () => {
  const { config } = useChain();
  const { data: delegations, isLoading, error } = useDelegations();
  const selectedChainSlug = useChainStore((state) => state.selectedChainSlug);
  const { decimals, symbol } = config.stakingToken;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Delegations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader><CardTitle>Active Delegations</CardTitle></CardHeader>
        <CardContent>
          <p role="alert" className="text-destructive">{error.message}</p>
          <Link href={`/stake/${selectedChainSlug}`}>View staking details</Link>
        </CardContent>
      </Card>
    );
  }

  if (!delegations || delegations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Delegations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
            <p>No active delegations</p>
            <Link href={`/stake/${selectedChainSlug}`}>
              <Button variant="outline" className="gap-2">
                Start Staking <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Active Delegations</CardTitle>
        <Link href={`/stake/${selectedChainSlug}`}>
          <Button variant="outline" size="sm">
            Manage <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Validator</TableHead>
              <TableHead className="text-right">Staked</TableHead>
              <TableHead className="text-right">Rewards</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {delegations.map((delegation, index) => (
              <TableRow key={`${delegation.validatorAddress}-${index}`}>
                <TableCell className="font-medium">
                  {delegation.validatorName}
                </TableCell>
                <TableCell className="text-right">
                  {formatTokenAmount(delegation.amount, decimals, 4)} {symbol}
                </TableCell>
                <TableCell className="text-right">
                  {config.rewardTokens?.length ? 'See reward totals above' : (() => {
                    const reward = formatRewardDisplay(delegation.rewards, decimals, symbol);
                    return (
                      <>
                        {reward.value}{' '}
                        {reward.tooltip ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-muted-foreground cursor-help underline decoration-dotted underline-offset-2">
                                {reward.unit}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{reward.tooltip}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground">{reward.unit}</span>
                        )}
                      </>
                    );
                  })()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export { DelegationList };
