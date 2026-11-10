'use client';

import { useState } from 'react';
import { formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WalletSelectDialog } from '@/components/layout/WalletSelectDialog';
import { LiquidStakeForm } from '@/features/liquid-staking/LiquidStakeForm';
import { useTonstakersStaking } from './useTonstakersStaking';

export function TonstakersStakingView() {
  const staking = useTonstakersStaking();
  const [walletOpen, setWalletOpen] = useState(false);
  const position = staking.position.data;
  const error = staking.error ?? staking.position.error?.message ?? staking.withdrawals.error?.message ?? staking.receipt.error?.message ?? (staking.receipt.data === 'failed' ? 'The TON transaction failed.' : null);
  const ready = !!staking.owner && !!position && !staking.position.error;
  return <div className="space-y-6">
    <div><h2 className="text-2xl font-bold">Tonstakers</h2><p className="text-muted-foreground">Stake TON to receive tsTON. Request a withdrawal with tsTON, TON is paid automatically when the protocol processes your withdrawal.</p></div>
    <WalletSelectDialog open={walletOpen} onOpenChange={setWalletOpen} />
    {!staking.owner && <Button onClick={() => setWalletOpen(true)}>Connect TON Wallet</Button>}
    {staking.position.isLoading && <p role="status">Loading Tonstakers position…</p>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <Card><CardHeader><CardTitle>Your liquid stake</CardTitle></CardHeader><CardContent className="space-y-2">
      <p>Available: {position ? formatUnits(position.available, 9) : 'Unavailable'} TON</p>
      <p>Receipt balance: {position ? formatUnits(position.receipt, 9) : 'Unavailable'} tsTON</p>
      <p className="text-sm text-muted-foreground">tsTON accrues staking rewards through its exchange rate. Gas is paid in TON.</p>
    </CardContent></Card>
    <LiquidStakeForm stakeSymbol="TON" unstakeSymbol="tsTON" ready={ready} pending={staking.pending} onSubmit={(kind, amount) => void staking.execute({ kind, amount })} />
    <Card><CardHeader><CardTitle>Automatic withdrawal payouts</CardTitle></CardHeader><CardContent className="space-y-3">
      {staking.withdrawals.isLoading && <p role="status">Loading withdrawal requests…</p>}
      {staking.withdrawals.data?.length === 0 && <p>No active withdrawal receipts.</p>}
      {staking.withdrawals.data?.map((request) => <div key={request.address} className="border-b py-3">
        <p className="break-all">Receipt: {request.address}</p>
        <p>Round end: {new Date(request.roundEnd * 1000).toLocaleString()}</p>
      </div>)}
      <p className="text-sm text-muted-foreground">Payout timing depends on the staking round and protocol processing. No separate claim transaction is required.</p>
      <p className="text-sm text-muted-foreground">Staking attaches an extra 1 TON for execution. Withdrawal requests attach 1.05 TON. Unused execution funds are returned by the protocol.</p>
    </CardContent></Card>
    {staking.submitted?.hash && <a className="block break-all underline" href={`https://tonviewer.com/transaction/${staking.submitted?.hash}`} target="_blank" rel="noreferrer">{staking.receipt.data === 'success' ? 'Confirmed transaction' : 'Submitted transaction'}: {staking.submitted?.hash}</a>}
    <a className="text-sm underline" href="https://docs.tonstakers.com/" target="_blank" rel="noreferrer">Tonstakers protocol documentation</a>
  </div>;
}
