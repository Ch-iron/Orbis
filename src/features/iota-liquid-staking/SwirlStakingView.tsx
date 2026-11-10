'use client';

import { useState } from 'react';
import { formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WalletSelectDialog } from '@/components/layout/WalletSelectDialog';
import { LiquidStakeForm } from '@/features/liquid-staking/LiquidStakeForm';
import { useSwirlStaking } from './useSwirlStaking';

export function SwirlStakingView() {
  const staking = useSwirlStaking();
  const [walletOpen, setWalletOpen] = useState(false);
  const position = staking.position.data;
  const error = staking.error ?? staking.position.error?.message;
  const ready = !!staking.owner && !!position && !staking.position.error;
  return <div className="space-y-6">
    <div><h2 className="text-2xl font-bold">Swirl</h2><p className="text-muted-foreground">Stake IOTA to receive stIOTA. Unstaking burns stIOTA and returns IOTA in the same transaction, subject to the protocol exchange rate and fees.</p></div>
    <WalletSelectDialog open={walletOpen} onOpenChange={setWalletOpen} />
    {!staking.owner && <Button onClick={() => setWalletOpen(true)}>Connect IOTA Wallet</Button>}
    {staking.position.isLoading && <p role="status">Loading Swirl position…</p>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <Card><CardHeader><CardTitle>Your liquid stake</CardTitle></CardHeader><CardContent className="space-y-2">
      <p>Available: {position ? formatUnits(position.available, 9) : 'Unavailable'} IOTA</p>
      <p>Receipt balance: {position ? formatUnits(position.receipt, 9) : 'Unavailable'} stIOTA</p>
      <p className="text-sm text-muted-foreground">stIOTA accrues staking rewards through its exchange rate. Gas is paid in IOTA.</p>
    </CardContent></Card>
    <LiquidStakeForm stakeSymbol="IOTA" unstakeSymbol="stIOTA" ready={ready} pending={staking.pending} onSubmit={(kind, amount) => void staking.execute({ kind, amount })} />
    <p className="text-sm text-muted-foreground">Swirl processes redemption directly. There is no separate withdrawal queue or claim transaction. Orbis simulates each transaction before requesting your signature.</p>
    {staking.digest && <a className="block break-all underline" href={`https://explorer.iota.org/txblock/${staking.digest}`} target="_blank" rel="noreferrer">{staking.confirmed ? 'Confirmed transaction' : 'Submitted transaction'}: {staking.digest}</a>}
    <a className="text-sm underline" href="https://docs.swirlstake.com/tech/iota-contract-infrastructure/" target="_blank" rel="noreferrer">Swirl protocol documentation</a>
  </div>;
}
