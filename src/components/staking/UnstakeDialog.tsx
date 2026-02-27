'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useChain } from '@/hooks/useChain';
import { useStakingActions } from '@/hooks/useStakingActions';
import { formatTokenAmount, parseTokenAmount } from '@/lib/utils/format';
import { showTxToast } from '@/components/common/TxStatusToast';
import { Loader2 } from 'lucide-react';
import type { Delegation } from '@/lib/chains/types';

type UnstakeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  delegation: Delegation;
};

const UnstakeDialog = ({ open, onOpenChange, delegation }: UnstakeDialogProps) => {
  const { config } = useChain();
  const { undelegate, isReady } = useStakingActions();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const { decimals, symbol } = config.stakingToken;

  const stakedFormatted = formatTokenAmount(delegation.amount, decimals, 6);

  const handleUndelegate = async () => {
    if (!amount || Number(amount) <= 0) {
      return;
    }

    setLoading(true);
    const rawAmount = parseTokenAmount(amount, decimals);
    const result = await undelegate({ validatorAddress: delegation.validatorAddress, amount: rawAmount });
    showTxToast(result, 'Undelegate');
    setLoading(false);

    if (result.success) {
      setAmount('');
      onOpenChange(false);
    }
  };

  const handleMax = () => {
    setAmount(stakedFormatted.replace(/,/g, ''));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unstake from {delegation.validatorName}</DialogTitle>
          <DialogDescription>
            Unstaking takes {config.unbondingDays} days. Your tokens will be locked during this period.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label>Amount ({symbol})</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(event) => { setAmount(event.target.value); }}
                min="0"
                step="0.000001"
              />
              <Button variant="outline" onClick={handleMax}>
                MAX
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Currently staked: {stakedFormatted} {symbol}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); }}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleUndelegate}
            disabled={!isReady || loading || !amount || Number(amount) <= 0}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Unstake
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { UnstakeDialog };
