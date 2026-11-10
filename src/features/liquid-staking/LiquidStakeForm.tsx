'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type LiquidStakeFormProps = {
  stakeSymbol: string;
  unstakeSymbol: string;
  ready: boolean;
  pending: boolean;
  onSubmit: (kind: 'stake' | 'unstake', amount: string) => void;
};

export function LiquidStakeForm({ stakeSymbol, unstakeSymbol, ready, pending, onSubmit }: LiquidStakeFormProps) {
  const [kind, setKind] = useState<'stake' | 'unstake'>('stake');
  const [amount, setAmount] = useState('');
  return (
    <Card>
      <CardHeader><CardTitle>Manage liquid stake</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          {(['stake', 'unstake'] as const).map((action) => <Button key={action} disabled={pending} variant={kind === action ? 'default' : 'outline'} onClick={() => { setKind(action); setAmount(''); }}>{action === 'stake' ? 'Stake' : 'Unstake'}</Button>)}
        </div>
        <label className="block space-y-2 text-sm">
          <span>Amount ({kind === 'stake' ? stakeSymbol : unstakeSymbol})</span>
          <Input aria-label="Liquid staking amount" inputMode="decimal" placeholder="0.0" value={amount} disabled={pending} onChange={(event) => setAmount(event.target.value)} />
        </label>
        <Button disabled={!ready || pending || !amount} onClick={() => { if (ready && !pending && amount) onSubmit(kind, amount); }}>
          {pending ? 'Waiting for wallet / confirmation…' : kind === 'stake' ? 'Stake' : 'Unstake'}
        </Button>
      </CardContent>
    </Card>
  );
}
