'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useDelegations, useRewards } from '@/hooks/useStaking';
import { useChain } from '@/hooks/useChain';
import { useStakingActions } from '@/hooks/useStakingActions';
import { formatTokenAmount } from '@/lib/utils/format';
import { showTxToast } from '@/components/common/TxStatusToast';
import { Loader2 } from 'lucide-react';

type HarvestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const HarvestDialog = ({ open, onOpenChange }: HarvestDialogProps) => {
  const { config } = useChain();
  const { data: rewards } = useRewards();
  const { data: delegations } = useDelegations();
  const { withdrawRewards, isReady } = useStakingActions();
  const [loading, setLoading] = useState(false);
  const { decimals, symbol } = config.stakingToken;

  const validatorAddresses =
    delegations?.map((delegation) => delegation.validatorAddress) ?? [];

  const handleHarvest = async () => {
    if (validatorAddresses.length === 0) {
      return;
    }

    setLoading(true);
    const result = await withdrawRewards({ validatorAddresses });
    showTxToast(result, 'Harvest Rewards');
    setLoading(false);

    if (result.success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Harvest Rewards</DialogTitle>
          <DialogDescription>
            Withdraw pending staking rewards to your wallet.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              Total Rewards
            </span>
            <span className="text-lg font-bold">
              {formatTokenAmount(rewards?.total ?? '0', decimals, 6)} {symbol}
            </span>
          </div>
          <Separator />
          <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto">
            {(rewards?.perValidator ?? []).map((reward) => {
              const validatorName =
                delegations?.find(
                  (delegation) =>
                    delegation.validatorAddress === reward.validatorAddress
                )?.validatorName ??
                reward.validatorAddress.slice(0, 16) + '...';

              return (
                <div
                  key={reward.validatorAddress}
                  className="flex justify-between text-sm"
                >
                  <span className="text-muted-foreground truncate max-w-[200px]">
                    {validatorName}
                  </span>
                  <span>
                    {formatTokenAmount(reward.amount, decimals, 6)} {symbol}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleHarvest}
            disabled={
              !isReady || loading || !rewards || rewards.total === '0'
            }
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Harvest All
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { HarvestDialog };
