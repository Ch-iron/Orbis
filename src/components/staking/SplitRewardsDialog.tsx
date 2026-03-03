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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useDelegations, useRewards } from '@/hooks/useStaking';
import { useChain } from '@/hooks/useChain';
import { useStakingActions } from '@/hooks/useStakingActions';
import { useExchangeStore } from '@/stores/exchangeStore';
import { formatTokenAmount, parseTokenAmount } from '@/lib/utils/format';
import { showTxToast } from '@/components/common/TxStatusToast';
import { Loader2, Plus, Trash2 } from 'lucide-react';

type RestakeTargetMode = 'proportional' | 'single';

type SplitRewardsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const SplitRewardsDialog = ({
  open,
  onOpenChange,
}: SplitRewardsDialogProps) => {
  const { config } = useChain();
  const { data: rewards } = useRewards();
  const { data: delegations } = useDelegations();
  const { splitRewards, isReady } = useStakingActions();
  const { addresses, addAddress, removeAddress } = useExchangeStore();
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [exchangeAmount, setExchangeAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [targetMode, setTargetMode] = useState<RestakeTargetMode>('proportional');
  const [singleValidator, setSingleValidator] = useState('');
  const { decimals, symbol } = config.stakingToken;

  const [restakeAmount, setRestakeAmount] = useState('');
  const totalRewardsRaw = rewards?.total ?? '0';
  const totalRewardsFormatted = formatTokenAmount(totalRewardsRaw, decimals, 6);
  const exchangeRaw = parseTokenAmount(exchangeAmount === '' ? '0' : exchangeAmount, decimals);
  const restakeRaw = parseTokenAmount(restakeAmount === '' ? '0' : restakeAmount, decimals);
  const sumRaw = BigInt(exchangeRaw) + BigInt(restakeRaw);
  const isOverTotal = sumRaw > BigInt(totalRewardsRaw);
  const remainingRaw = (() => {
    if (isOverTotal) {
      return '0';
    }

    return (BigInt(totalRewardsRaw) - sumRaw).toString();
  })();
  const remainingFormatted = formatTokenAmount(remainingRaw, decimals, 6);

  const selectedExchange = addresses.find(
    (address) => address.id === selectedAddressId,
  );

  const isExchangeAmountValid =
    !!exchangeAmount &&
    Number(exchangeAmount) > 0;

  const isRestakeAmountValid =
    !!restakeAmount &&
    Number(restakeAmount) > 0;

  const isSumValid = !isOverTotal && (isExchangeAmountValid || isRestakeAmountValid);

  const handleSplit = async () => {
    if (!selectedExchange || !isSumValid || !isExchangeAmountValid || !isRestakeAmountValid) {
      return;
    }

    if (targetMode === 'single' && !singleValidator) {
      return;
    }

    setLoading(true);

    const compoundDelegations = (() => {
      if (targetMode === 'single' && singleValidator) {
        return [
          { validatorAddress: singleValidator, amount: restakeRaw },
        ];
      }

      // Proportional: distribute remaining rewards by existing delegation ratio
      const totalDelegated =
        delegations?.reduce(
          (accumulator, delegation) =>
            accumulator + BigInt(delegation.amount ?? '0'),
          BigInt(0),
        ) ?? BigInt(1);
      const restakeTotal = BigInt(restakeRaw);

      return (delegations ?? []).map((delegation) => ({
        validatorAddress: delegation.validatorAddress,
        amount: (
          (restakeTotal * BigInt(delegation.amount)) /
          totalDelegated
        ).toString(),
      }));
    })();

    const result = await splitRewards({
      toAddress: selectedExchange.address,
      exchangeAmount: exchangeRaw,
      delegations: compoundDelegations,
    }).catch((error) => {
      console.error('split rewards error', error);
      return { success: false as const, txHash: null, error: 'Transaction failed' };
    });
    showTxToast(result, 'Split Rewards');
    setLoading(false);

    if (result.success) {
      setExchangeAmount('');
      setRestakeAmount('');
      onOpenChange(false);
    }
  };

  const handleAddExchange = () => {
    if (!newName.trim() || !newAddress.trim()) {
      return;
    }

    addAddress(newName.trim(), newAddress.trim());
    setNewName('');
    setNewAddress('');
    setShowAddForm(false);
  };

  const handleMaxExchange = () => {
    const remainingAfterRestake = (() => {
      const total = BigInt(totalRewardsRaw);
      const restake = BigInt(restakeRaw);

      if (restake >= total) {
        return '0';
      }

      return (total - restake).toString();
    })();
    setExchangeAmount(formatTokenAmount(remainingAfterRestake, decimals, 6).replace(/,/g, ''));
  };

  const handleMaxRestake = () => {
    const remainingAfterExchange = (() => {
      const total = BigInt(totalRewardsRaw);
      const exchange = BigInt(exchangeRaw);

      if (exchange >= total) {
        return '0';
      }

      return (total - exchange).toString();
    })();
    setRestakeAmount(formatTokenAmount(remainingAfterExchange, decimals, 6).replace(/,/g, ''));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Split Rewards</DialogTitle>
          <DialogDescription>
            Split your rewards — send part to an exchange and restake the rest in
            a single transaction.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          {/* Total rewards display */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              Total Rewards
            </span>
            <span className="text-lg font-bold">
              {totalRewardsFormatted} {symbol}
            </span>
          </div>

          <Separator />

          {/* Exchange address selection */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Exchange Address</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddForm(!showAddForm);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            {showAddForm && (
              <div className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-muted/50">
                <Input
                  placeholder="Exchange name (e.g. Binance)"
                  value={newName}
                  onChange={(event) => {
                    setNewName(event.target.value);
                  }}
                />
                <Input
                  placeholder="Deposit address"
                  value={newAddress}
                  onChange={(event) => {
                    setNewAddress(event.target.value);
                  }}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddExchange}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {addresses.length > 0 ? (
              <Select
                value={selectedAddressId}
                onValueChange={setSelectedAddressId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select exchange" />
                </SelectTrigger>
                <SelectContent>
                  {addresses.map((addr) => (
                    <SelectItem key={addr.id} value={addr.id}>
                      {addr.name} ({addr.address.slice(0, 10)}...)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">
                No saved addresses. Add an exchange address first.
              </p>
            )}

            {selectedExchange && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground truncate max-w-[250px]">
                  {selectedExchange.address}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    removeAddress(selectedExchange.id);
                    setSelectedAddressId('');
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          <Separator />

          {/* Exchange amount input */}
          <div className="flex flex-col gap-2">
            <Label>Send to Exchange ({symbol})</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="0.00"
                value={exchangeAmount}
                onChange={(event) => {
                  setExchangeAmount(event.target.value);
                }}
                min="0"
                step="0.000001"
              />
              <Button variant="outline" onClick={handleMaxExchange}>
                MAX
              </Button>
            </div>
          </div>

          {/* Restake amount input */}
          <div className="flex flex-col gap-2">
            <Label>Restake ({symbol})</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="0.00"
                value={restakeAmount}
                onChange={(event) => {
                  setRestakeAmount(event.target.value);
                }}
                min="0"
                step="0.000001"
              />
              <Button variant="outline" onClick={handleMaxRestake}>
                MAX
              </Button>
            </div>
          </div>

          {/* Remaining / validation */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              Unallocated
            </span>
            <span className={`text-sm font-semibold ${isOverTotal ? 'text-destructive' : ''}`}>
              {isOverTotal ? 'Exceeds total rewards' : `${remainingFormatted} ${symbol}`}
            </span>
          </div>

          <Separator />

          {/* Restake strategy */}
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
            onClick={handleSplit}
            disabled={
              !isReady ||
              loading ||
              !selectedExchange ||
              !isExchangeAmountValid ||
              !isRestakeAmountValid ||
              !isSumValid ||
              (targetMode === 'single' && !singleValidator)
            }
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Split Rewards
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { SplitRewardsDialog };
