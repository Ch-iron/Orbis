'use client';

import { useState } from 'react';
import { formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WalletSelectDialog } from '@/components/layout/WalletSelectDialog';
import { LiquidStakeForm } from '@/features/liquid-staking/LiquidStakeForm';
import { useXAlgoStaking } from './useXAlgoStaking';

export function XAlgoStakingView() {
  const staking = useXAlgoStaking();
  const [walletOpen, setWalletOpen] = useState(false);
  const position = staking.position.data;
  const error = staking.error ?? staking.position.error?.message;
  const ready = !!staking.owner && !!position && !staking.position.error;
  return <div className="space-y-6">
    <div><h2 className="text-2xl font-bold">Folks Finance · xALGO</h2><p className="text-muted-foreground">Stake ALGO to receive xALGO. Unstaking burns xALGO and returns ALGO in the same transaction, subject to the protocol exchange rate and fees.</p></div>
    <WalletSelectDialog open={walletOpen} onOpenChange={setWalletOpen} />
    {!staking.owner && <Button onClick={() => setWalletOpen(true)}>Connect Algorand Wallet</Button>}
    {staking.position.isLoading && <p role="status">Loading XAlgo position…</p>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <Card><CardHeader><CardTitle>Your liquid stake</CardTitle></CardHeader><CardContent className="space-y-2">
      <p>Available: {position ? formatUnits(position.available, 6) : 'Unavailable'} ALGO</p>
      <p>Receipt balance: {position ? formatUnits(position.receipt, 6) : 'Unavailable'} xALGO</p>
      <p>Staking premium: {position ? `${Number(position.state.premium) / 1e14}%` : 'Unavailable'}</p>
      <p className="text-sm text-muted-foreground">xALGO accrues staking rewards through its exchange rate. Gas is paid in ALGO.</p>
    </CardContent></Card>
    <LiquidStakeForm stakeSymbol="ALGO" unstakeSymbol="xALGO" ready={ready} pending={staking.pending} onSubmit={(kind, amount) => void staking.execute({ kind, amount })} />
    <p className="text-sm text-muted-foreground">Immediate staking includes the protocol premium. The transaction requires at least 99.5% of the current quoted output. Asset registration, when needed, reserves an additional 0.1 ALGO. Orbis simulates the complete group before signing.</p>
    {staking.txIds[0] && <a className="block break-all underline" href={`https://allo.info/tx/${staking.txIds[0]}`} target="_blank" rel="noreferrer">{staking.confirmed ? 'Confirmed transaction' : 'Submitted transaction'}: {staking.txIds[0]}</a>}
    <a className="text-sm underline" href="https://docs.folks.finance/functionalities/xalgo-liquid-staking" target="_blank" rel="noreferrer">Folks Finance documentation</a>
  </div>;
}
