'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBalance } from '@/hooks/useStaking';
import { useChain } from '@/hooks/useChain';
import { useStakingActions } from '@/hooks/useStakingActions';
import { formatTokenAmount, parseTokenAmount } from '@/lib/utils/format';
import { showTxToast } from '@/components/common/TxStatusToast';
import { Loader2 } from 'lucide-react';
import type { Validator } from '@/lib/chains/types';

type StakeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  validator: Validator;
};

const StakeDialog = ({ open, onOpenChange, validator }: StakeDialogProps) => {
  const { config } = useChain();
  const { data: balance } = useBalance();
  const { delegate, isReady } = useStakingActions();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const { decimals, symbol } = config.stakingToken;

  const availableFormatted = formatTokenAmount(balance ?? '0', decimals, 6);

  const handleDelegate = async () => {
    if (!amount || Number(amount) <= 0) {
      return;
    }

    setLoading(true);
    const rawAmount = parseTokenAmount(amount, decimals);
    const result = await delegate({ validatorAddress: validator.address, amount: rawAmount }).catch((error) => {
      console.error('delegate error', error);
      return { success: false as const, txHash: null, error: 'Transaction failed' };
    });
    showTxToast(result, 'Delegate');
    setLoading(false);

    if (result.success) {
      setAmount('');
      onOpenChange(false);
    }
  };

  const handleMax = () => {
    setAmount(availableFormatted.replace(/,/g, ''));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delegate to {validator.name}</DialogTitle>
          <DialogDescription>
            Enter the amount to delegate. Commission: {(validator.commission * 100).toFixed(2)}%
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
              Available: {availableFormatted} {symbol}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); }}>
            Cancel
          </Button>
          <Button
            onClick={handleDelegate}
            disabled={!isReady || loading || !amount || Number(amount) <= 0}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Delegate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { StakeDialog };
