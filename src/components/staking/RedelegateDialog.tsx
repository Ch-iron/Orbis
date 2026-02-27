'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useChain } from '@/hooks/useChain';
import { useValidators } from '@/hooks/useStaking';
import { useStakingActions } from '@/hooks/useStakingActions';
import { formatTokenAmount, parseTokenAmount } from '@/lib/utils/format';
import { showTxToast } from '@/components/common/TxStatusToast';
import { Loader2 } from 'lucide-react';
import type { Delegation } from '@/lib/chains/types';

type RedelegateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  delegation: Delegation;
};

const RedelegateDialog = ({ open, onOpenChange, delegation }: RedelegateDialogProps) => {
  const { config } = useChain();
  const { data: validators } = useValidators();
  const { redelegate, isReady } = useStakingActions();
  const [amount, setAmount] = useState('');
  const [targetValidator, setTargetValidator] = useState('');
  const [loading, setLoading] = useState(false);
  const { decimals, symbol } = config.stakingToken;

  const stakedFormatted = formatTokenAmount(delegation.amount, decimals, 6);

  // Filter out the source validator and only show active ones
  const availableValidators = (validators ?? []).filter(
    (validator) => validator.address !== delegation.validatorAddress && validator.status === 'active'
  );

  const handleRedelegate = async () => {
    if (!amount || Number(amount) <= 0 || !targetValidator) {
      return;
    }

    setLoading(true);
    const rawAmount = parseTokenAmount(amount, decimals);
    const result = await redelegate({
      srcValidatorAddress: delegation.validatorAddress,
      dstValidatorAddress: targetValidator,
      amount: rawAmount,
    });
    showTxToast(result, 'Redelegate');
    setLoading(false);

    if (result.success) {
      setAmount('');
      setTargetValidator('');
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
          <DialogTitle>Redelegate from {delegation.validatorName}</DialogTitle>
          <DialogDescription>
            Move your staked tokens to a different validator without unbonding.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label>Target Validator</Label>
            <Select value={targetValidator} onValueChange={setTargetValidator}>
              <SelectTrigger>
                <SelectValue placeholder="Select validator" />
              </SelectTrigger>
              <SelectContent>
                {availableValidators.map((validator) => (
                  <SelectItem key={validator.address} value={validator.address}>
                    {validator.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
            onClick={handleRedelegate}
            disabled={!isReady || loading || !amount || Number(amount) <= 0 || !targetValidator}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Redelegate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { RedelegateDialog };
