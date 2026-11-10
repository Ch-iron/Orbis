'use client';

import Image from 'next/image';
import Link from 'next/link';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { formatTokenAmount, formatRewardDisplay } from '@/lib/utils/format';
import type { ChainStakingData } from '@/hooks/useMultiChainStaking';
import type { ChainConfig, Delegation } from '@/lib/chains/types';

type DelegationWithChain = Delegation & {
  config: ChainConfig;
};

type MultiChainDelegationsProps = {
  chains: ChainStakingData[];
};

const MultiChainDelegations = ({ chains }: MultiChainDelegationsProps) => {
  const isLoading = chains.some((chain) => chain.delegationsLoading);

  const allDelegations: DelegationWithChain[] = chains.flatMap((chain) => {
    if (!chain.delegations) {
      return [];
    }
    return chain.delegations.map((delegation) => ({
      ...delegation,
      config: chain.config,
    }));
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Delegations</CardTitle>
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

  const failedChains = chains.filter((chain) => chain.address && chain.delegationsError);
  if (failedChains.length > 0) {
    return <Card><CardHeader><CardTitle>All Delegations</CardTitle></CardHeader><CardContent>
      <p role="alert" className="text-sm text-destructive">Staking data unavailable for {failedChains.map((chain) => chain.config.name).join(', ')}. A complete summary cannot be shown.</p>
    </CardContent></Card>;
  }

  if (allDelegations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Delegations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
            <p>No active delegations across any chain</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Delegations</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Chain</TableHead>
              <TableHead>Validator</TableHead>
              <TableHead className="text-right">Staked</TableHead>
              <TableHead className="text-right">Rewards</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {allDelegations.map((delegation) => {
              const { decimals, symbol } = delegation.config.stakingToken;
              const reward = formatRewardDisplay(delegation.rewards, decimals, symbol);

              return (
                <TableRow key={`${delegation.config.slug}-${delegation.validatorAddress}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Image
                        src={delegation.config.logo}
                        alt={delegation.config.name}
                        width={20}
                        height={20}
                        className="rounded-full"
                      />
                      <span className="text-sm font-medium">{delegation.config.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {delegation.validatorName}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatTokenAmount(delegation.amount, decimals, 4)}{' '}
                    <span className="text-muted-foreground">{symbol}</span>
                  </TableCell>
                  <TableCell className="text-right">
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
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/stake/${delegation.config.slug}`}>
                      <Button variant="ghost" size="sm">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export { MultiChainDelegations };
