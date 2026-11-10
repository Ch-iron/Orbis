'use client';

import { useState } from 'react';
import { formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WalletSelectDialog } from '@/components/layout/WalletSelectDialog';
import { LiquidStakeForm } from '@/features/liquid-staking/LiquidStakeForm';
import { useBeetsStaking } from './useBeetsStaking';

export function BeetsStakingView() {
  const staking = useBeetsStaking();
  const [walletOpen, setWalletOpen] = useState(false);
  const position = staking.position.data;
  const error = staking.error ?? staking.position.error?.message;
  const ready = !!staking.connected && !!position && !staking.position.error && staking.correctNetwork;
  return <div className="space-y-6">
    <div><h2 className="text-2xl font-bold">Beets</h2><p className="text-muted-foreground">Stake S to receive stS. Request a withdrawal with stS, then claim S when your withdrawal request unlocks.</p></div>
    <WalletSelectDialog open={walletOpen} onOpenChange={setWalletOpen} />
    {(!staking.connected || !staking.correctNetwork) && <Button onClick={() => setWalletOpen(true)}>Connect Sonic Wallet</Button>}
    {staking.position.isLoading && <p role="status">Loading Beets position…</p>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <Card><CardHeader><CardTitle>Your liquid stake</CardTitle></CardHeader><CardContent className="space-y-2">
      <p>Available: {position ? formatUnits(position.available, 18) : 'Unavailable'} S</p>
      <p>Receipt balance: {position ? formatUnits(position.receipt, 18) : 'Unavailable'} stS</p>
      <p>1 stS = {position ? formatUnits(position.rate, 18) : 'Unavailable'} S</p>
      <p className="text-sm text-muted-foreground">stS accrues staking rewards through its exchange rate. Gas is paid in S.</p>
    </CardContent></Card>
    <LiquidStakeForm stakeSymbol="S" unstakeSymbol="stS" ready={ready} pending={staking.pending} onSubmit={(kind, amount) => void staking.execute({ kind, amount })} />
    <Card><CardHeader><CardTitle>Withdrawal requests</CardTitle></CardHeader><CardContent className="space-y-3">
      {position?.withdrawals.length === 0 && <p>No pending withdrawals.</p>}
      {position?.withdrawals.map((ticket) => <div key={ticket.id.toString()} className="flex items-center justify-between gap-4 border-b py-3">
        <div><p>{formatUnits(ticket.amount, 18)} S</p><p className="text-sm text-muted-foreground">Unlock time: {new Date(Number(ticket.unlock) * 1000).toLocaleString()}</p></div>
        <Button disabled={!ready || staking.pending || !ticket.ready || position.withdrawPaused} onClick={() => void staking.execute({ kind: 'claim', requestId: ticket.id })}>Claim S</Button>
      </div>)}
      <p className="text-sm text-muted-foreground">The contract checks withdrawal readiness before signing. Withdrawal requests and claims require separate transactions.</p>
    </CardContent></Card>
    {staking.hash && <a className="block break-all underline" href={`https://sonicscan.org/tx/${staking.hash}`} target="_blank" rel="noreferrer">{staking.confirmed ? 'Confirmed transaction' : 'Submitted transaction'}: {staking.hash}</a>}
    <a className="text-sm underline" href="https://docs.beets.fi/sts/mechanics" target="_blank" rel="noreferrer">Beets protocol documentation</a>
  </div>;
}
