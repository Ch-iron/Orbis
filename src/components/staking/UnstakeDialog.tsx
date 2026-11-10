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
  const rawAmount = parseTokenAmount(amount, decimals);
  const amountError = amount && (rawAmount === null || (BigInt(rawAmount) <= BigInt(0) || BigInt(rawAmount) > BigInt(delegation.amount)))
    ? `Enter an amount within your staked balance with up to ${decimals} decimal places.` : null;

  const stakedFormatted = formatTokenAmount(delegation.amount, decimals, 6);

  const handleUndelegate = async () => {
    if (loading || !isReady || !rawAmount || (BigInt(rawAmount) <= BigInt(0) || BigInt(rawAmount) > BigInt(delegation.amount))) {
      return;
    }

    setLoading(true);
    const result = await undelegate({ validatorAddress: delegation.validatorAddress, amount: rawAmount }).catch((error) => {
      console.error('undelegate error', error);
      return { success: false as const, txHash: null, error: 'Transaction failed' };
    });
    showTxToast(result, 'Undelegate');
    setLoading(false);

    if (result.success) {
      setAmount('');
      onOpenChange(false);
    }
  };

  const handleMax = () => {
    setAmount(formatTokenAmount(delegation.amount, decimals, decimals).replace(/,/g, ''));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unstake from {delegation.validatorName}</DialogTitle>
          <DialogDescription>
            {config.unbondingDays === null
              ? 'Withdrawal timing depends on the protocol. Your tokens remain locked until finalization.'
              : `Unstaking takes ${config.unbondingDays} days. Your tokens will be locked during this period.`}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label>Amount ({symbol})</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                inputMode="decimal"
                disabled={loading}
                aria-label={`Amount (${symbol})`}
                aria-invalid={!!amountError}
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
        {amountError && <p role="alert" className="text-sm text-destructive">{amountError}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); }}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleUndelegate}
            disabled={!isReady || loading || !rawAmount || (BigInt(rawAmount) <= BigInt(0) || BigInt(rawAmount) > BigInt(delegation.amount))}
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
