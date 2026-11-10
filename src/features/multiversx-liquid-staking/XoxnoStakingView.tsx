'use client';

import { useState } from 'react';
import { formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WalletSelectDialog } from '@/components/layout/WalletSelectDialog';
import { LiquidStakeForm } from '@/features/liquid-staking/LiquidStakeForm';
import { useXoxnoStaking } from './useXoxnoStaking';

export function XoxnoStakingView() {
  const staking = useXoxnoStaking();
  const [walletOpen, setWalletOpen] = useState(false);
  const position = staking.position.data;
  const ready = !!staking.owner && !!position && position.active && !staking.position.error;
  const error = staking.error ?? staking.position.error?.message;
  return <div className="space-y-6">
    <div><h2 className="text-2xl font-bold">XOXNO · xEGLD</h2><p className="text-muted-foreground">Stake EGLD for xEGLD. Redemptions use available liquidity first; the remaining amount becomes an unbonding token that you can claim after the waiting period.</p></div>
    <WalletSelectDialog open={walletOpen} onOpenChange={setWalletOpen} />
    {!staking.owner && <Button onClick={() => setWalletOpen(true)}>Connect MultiversX Wallet</Button>}
    {staking.position.isLoading && <p role="status">Loading XOXNO position…</p>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <Card><CardHeader><CardTitle>Your liquid stake</CardTitle></CardHeader><CardContent className="space-y-2">
      <p>Available: {position ? formatUnits(position.available, 18) : 'Unavailable'} EGLD</p>
      <p>Receipt balance: {position ? formatUnits(position.receipt, 18) : 'Unavailable'} xEGLD</p>
      <p>1 xEGLD = {position ? formatUnits(position.rate, 18) : 'Unavailable'} EGLD</p>
      <p>Unbonding period: {position ? position.unbondPeriod.toString() : 'Unavailable'} epochs</p>
    </CardContent></Card>
    <LiquidStakeForm stakeSymbol="EGLD" unstakeSymbol="xEGLD" ready={ready} pending={staking.pending} onSubmit={(kind, amount) => void staking.execute({ kind, amount })} />
    <Card><CardHeader><CardTitle>Unbonding tokens</CardTitle></CardHeader><CardContent className="space-y-3">
      {position?.tickets.length === 0 && <p>No unbonding tokens in this wallet.</p>}
      {position?.tickets.map((ticket) => <div key={ticket.id} className="flex items-center justify-between gap-4 rounded-lg border p-3">
        <div><p>{formatUnits(ticket.amount, 18)} EGLD</p><p className="text-sm text-muted-foreground">Unlock epoch: {ticket.unlockEpoch.toString()}</p></div>
        <Button disabled={!ready || staking.pending || !ticket.ready} onClick={() => void staking.execute({ kind: 'claim', ticketId: ticket.id })}>Claim EGLD</Button>
      </div>)}
      <p className="text-sm text-muted-foreground">Claims also depend on funds returning from validators. If only part is available, the contract returns the remaining unbonding tokens to your wallet.</p>
    </CardContent></Card>
    {staking.hash && <a className="block break-all underline" href={`https://explorer.multiversx.com/transactions/${staking.hash}`} target="_blank" rel="noreferrer">{staking.confirmed ? 'Confirmed transaction' : 'Submitted transaction'}: {staking.hash}</a>}
    <a className="text-sm underline" href="https://github.com/XOXNO/rs-liquid-staking-sc" target="_blank" rel="noreferrer">XOXNO protocol documentation</a>
  </div>;
}
