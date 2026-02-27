'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDelegations } from '@/hooks/useStaking';
import { useChain } from '@/hooks/useChain';
import { formatTokenAmount } from '@/lib/utils/format';
import { UnstakeDialog } from './UnstakeDialog';
import { RedelegateDialog } from './RedelegateDialog';
import { HarvestDialog } from './HarvestDialog';
import { RestakeDialog } from './RestakeDialog';
import { SendToExchangeDialog } from './SendToExchangeDialog';
import { SplitRewardsDialog } from './SplitRewardsDialog';
import type { Delegation } from '@/lib/chains/types';

const StakingDelegationList = () => {
  const { config } = useChain();
  const { data: delegations, isLoading } = useDelegations();
  const { decimals, symbol } = config.stakingToken;
  const [unstakeTarget, setUnstakeTarget] = useState<Delegation | null>(null);
  const [redelegateTarget, setRedelegateTarget] = useState<Delegation | null>(null);
  const [harvestDialogOpen, setHarvestDialogOpen] = useState(false);
  const [restakeDialogOpen, setRestakeDialogOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [splitRewardsDialogOpen, setSplitRewardsDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>My Delegations</CardTitle></CardHeader>
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

  if (!delegations || delegations.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>My Delegations</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-8 gap-3">
            <Image src="/mascot-empty.svg" alt="No delegations" width={80} height={80} />
            <p className="text-muted-foreground">No active delegations</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>My Delegations</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { setHarvestDialogOpen(true); }}>
              Harvest All
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setRestakeDialogOpen(true); }}>
              Restake
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setSendDialogOpen(true); }}>
              Send to Exchange
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setSplitRewardsDialogOpen(true); }}>
              Split Rewards
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Validator</TableHead>
                <TableHead className="text-right">Staked</TableHead>
                <TableHead className="text-right">Rewards</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {delegations.map((delegation) => (
                <TableRow key={delegation.validatorAddress}>
                  <TableCell className="font-medium">{delegation.validatorName}</TableCell>
                  <TableCell className="text-right">
                    {formatTokenAmount(delegation.amount, decimals, 4)} {symbol}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatTokenAmount(delegation.rewards, decimals, 4)} {symbol}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="outline" onClick={() => { setUnstakeTarget(delegation); }}>
                        Unstake
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setRedelegateTarget(delegation); }}>
                        Redelegate
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {unstakeTarget && (
        <UnstakeDialog
          open={!!unstakeTarget}
          onOpenChange={(open) => { if (!open) { setUnstakeTarget(null); } }}
          delegation={unstakeTarget}
        />
      )}

      {redelegateTarget && (
        <RedelegateDialog
          open={!!redelegateTarget}
          onOpenChange={(open) => { if (!open) { setRedelegateTarget(null); } }}
          delegation={redelegateTarget}
        />
      )}

      <HarvestDialog
        open={harvestDialogOpen}
        onOpenChange={setHarvestDialogOpen}
      />

      <RestakeDialog
        open={restakeDialogOpen}
        onOpenChange={setRestakeDialogOpen}
      />

      <SendToExchangeDialog
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
      />

      <SplitRewardsDialog
        open={splitRewardsDialogOpen}
        onOpenChange={setSplitRewardsDialogOpen}
      />
    </>
  );
};

export { StakingDelegationList };
