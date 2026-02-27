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
import { useBalance } from '@/hooks/useStaking';
import { useChain } from '@/hooks/useChain';
import { useStakingActions } from '@/hooks/useStakingActions';
import { useExchangeStore } from '@/stores/exchangeStore';
import { formatTokenAmount, parseTokenAmount } from '@/lib/utils/format';
import { showTxToast } from '@/components/common/TxStatusToast';
import { Loader2, Plus, Trash2 } from 'lucide-react';

type SendToExchangeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const SendToExchangeDialog = ({
  open,
  onOpenChange,
}: SendToExchangeDialogProps) => {
  const { config } = useChain();
  const { data: balance } = useBalance();
  const { send, isReady } = useStakingActions();
  const { addresses, addAddress, removeAddress } = useExchangeStore();
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const { decimals, symbol } = config.stakingToken;

  const availableFormatted = formatTokenAmount(balance ?? '0', decimals, 6);
  const selectedExchange = addresses.find(
    (address) => address.id === selectedAddressId
  );

  const handleSend = async () => {
    if (!amount || Number(amount) <= 0 || !selectedExchange) {
      return;
    }

    setLoading(true);
    const rawAmount = parseTokenAmount(amount, decimals);
    const result = await send({
      toAddress: selectedExchange.address,
      amount: rawAmount,
    });
    showTxToast(result, 'Send to Exchange');
    setLoading(false);

    if (result.success) {
      setAmount('');
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

  const handleMax = () => {
    setAmount(availableFormatted.replace(/,/g, ''));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send to Exchange</DialogTitle>
          <DialogDescription>
            Send tokens to your exchange deposit address.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
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

            {/* Display full address and delete option for selected exchange */}
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

          {/* Amount input */}
          <div className="flex flex-col gap-2">
            <Label>Amount ({symbol})</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value);
                }}
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
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={
              !isReady ||
              loading ||
              !amount ||
              Number(amount) <= 0 ||
              !selectedExchange
            }
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { SendToExchangeDialog };
