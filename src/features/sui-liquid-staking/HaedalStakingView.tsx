'use client';

import { useState } from 'react';
import { formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WalletSelectDialog } from '@/components/layout/WalletSelectDialog';
import { LiquidStakeForm } from '@/features/liquid-staking/LiquidStakeForm';
import { useHaedalStaking } from './useHaedalStaking';

export function HaedalStakingView() {
  const staking = useHaedalStaking();
  const [walletOpen, setWalletOpen] = useState(false);
  const position = staking.position.data;
  const error = staking.error ?? staking.position.error?.message;
  const ready = !!staking.owner && !!position && !staking.position.error;
  return <div className="space-y-6">
    <div><h2 className="text-2xl font-bold">Haedal</h2><p className="text-muted-foreground">Stake SUI to receive haSUI. Request a withdrawal with haSUI, then claim SUI when your withdrawal ticket unlocks.</p></div>
    <WalletSelectDialog open={walletOpen} onOpenChange={setWalletOpen} />
    {!staking.owner && <Button onClick={() => setWalletOpen(true)}>Connect Sui Wallet</Button>}
    {staking.position.isLoading && <p role="status">Loading Haedal position…</p>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <Card><CardHeader><CardTitle>Your liquid stake</CardTitle></CardHeader><CardContent className="space-y-2">
      <p>Available: {position ? formatUnits(position.available, 9) : 'Unavailable'} SUI</p>
      <p>Receipt balance: {position ? formatUnits(position.receipt, 9) : 'Unavailable'} haSUI</p>
      <p className="text-sm text-muted-foreground">haSUI accrues staking rewards through its exchange rate. Gas is paid in SUI.</p>
    </CardContent></Card>
    <LiquidStakeForm stakeSymbol="SUI" unstakeSymbol="haSUI" ready={ready} pending={staking.pending} onSubmit={(kind, amount) => void staking.execute({ kind, amount })} />
    <Card><CardHeader><CardTitle>Withdrawal tickets</CardTitle></CardHeader><CardContent className="space-y-3">
      {position?.tickets.length === 0 && <p>No pending withdrawals.</p>}
      {position?.tickets.map((ticket) => <div key={ticket.objectId} className="flex items-center justify-between gap-4 border-b py-3">
        <div><p>{formatUnits(ticket.amount, 9)} SUI</p><p className="text-sm text-muted-foreground">Unlock epoch: {String(ticket.claimEpoch)}</p></div>
        <Button disabled={!ready || staking.pending || ticket.claimEpoch > position.epoch} onClick={() => void staking.execute({ kind: 'claim', objectId: ticket.objectId })}>Claim SUI</Button>
      </div>)}
      <p className="text-sm text-muted-foreground">The contract checks ticket readiness before signing. Withdrawal requests and claims require separate transactions.</p>
    </CardContent></Card>
    {staking.digest && <a className="block break-all underline" href={`https://suiscan.xyz/mainnet/tx/${staking.digest}`} target="_blank" rel="noreferrer">{staking.confirmed ? 'Confirmed transaction' : 'Submitted transaction'}: {staking.digest}</a>}
    <a className="text-sm underline" href="https://github.com/haedallsd/haedal-protocol-interface" target="_blank" rel="noreferrer">Haedal protocol documentation</a>
  </div>;
}
