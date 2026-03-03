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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useDelegations, useRewards } from '@/hooks/useStaking';
import { useChain } from '@/hooks/useChain';
import { useStakingActions } from '@/hooks/useStakingActions';
import { formatTokenAmount } from '@/lib/utils/format';
import { showTxToast } from '@/components/common/TxStatusToast';
import { Loader2 } from 'lucide-react';

type RestakeTargetMode = 'proportional' | 'single';

type RestakeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const RestakeDialog = ({ open, onOpenChange }: RestakeDialogProps) => {
  const { config } = useChain();
  const { data: rewards } = useRewards();
  const { data: delegations } = useDelegations();
  const { compound, isReady } = useStakingActions();
  const [loading, setLoading] = useState(false);
  const [targetMode, setTargetMode] = useState<RestakeTargetMode>('proportional');
  const [singleValidator, setSingleValidator] = useState('');
  const { decimals, symbol } = config.stakingToken;

  const handleRestake = async () => {
    if (!rewards || rewards.total === '0') {
      return;
    }

    setLoading(true);

    // Build compound delegation params based on strategy
    const compoundDelegations = (() => {
      if (targetMode === 'single' && singleValidator) {
        return [
          { validatorAddress: singleValidator, amount: rewards.total },
        ];
      }

      // Proportional: distribute rewards proportionally to existing delegations
      const totalDelegated =
        delegations?.reduce(
          (accumulator, delegation) =>
            accumulator + BigInt(delegation.amount ?? '0'),
          BigInt(0)
        ) ?? BigInt(1);
      const totalRewards = BigInt(rewards.total);

      return (delegations ?? []).map((delegation) => ({
        validatorAddress: delegation.validatorAddress,
        amount: (
          (totalRewards * BigInt(delegation.amount)) /
          totalDelegated
        ).toString(),
      }));
    })();

    const result = await compound({ delegations: compoundDelegations }).catch((error) => {
      console.error('compound error', error);
      return { success: false as const, txHash: null, error: 'Transaction failed' };
    });
    showTxToast(result, 'Restake');
    setLoading(false);

    if (result.success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restake (Compound)</DialogTitle>
          <DialogDescription>
            Withdraw rewards and immediately redelegate them to earn compound
            interest.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              Rewards to Restake
            </span>
            <span className="text-lg font-bold">
              {formatTokenAmount(rewards?.total ?? '0', decimals, 6)} {symbol}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Restake Strategy</Label>
            <Select
              value={targetMode}
              onValueChange={(value) => {
                setTargetMode(value as RestakeTargetMode);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="proportional">
                  Proportional (existing validators)
                </SelectItem>
                <SelectItem value="single">Single Validator</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {targetMode === 'single' && (
            <div className="flex flex-col gap-2">
              <Label>Validator</Label>
              <Select
                value={singleValidator}
                onValueChange={setSingleValidator}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select validator" />
                </SelectTrigger>
                <SelectContent>
                  {(delegations ?? []).map((delegation) => (
                    <SelectItem
                      key={delegation.validatorAddress}
                      value={delegation.validatorAddress}
                    >
                      {delegation.validatorName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
            onClick={handleRestake}
            disabled={
              !isReady ||
              loading ||
              !rewards ||
              rewards.total === '0' ||
              (targetMode === 'single' && !singleValidator)
            }
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Restake
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { RestakeDialog };
