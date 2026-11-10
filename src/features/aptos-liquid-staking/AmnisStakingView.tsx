'use client';

import { useState } from 'react';
import { formatUnits } from 'viem';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WalletSelectDialog } from '@/components/layout/WalletSelectDialog';
import { LiquidStakeForm } from '@/features/liquid-staking/LiquidStakeForm';
import { useAmnisStaking } from './useAmnisStaking';

export function AmnisStakingView() {
  const staking = useAmnisStaking();
  const [walletOpen, setWalletOpen] = useState(false);
  const [redeemAmount, setRedeemAmount] = useState('');
  const position = staking.position.data;
  const error = staking.error ?? staking.position.error?.message;
  const ready = !!staking.owner && !!position && !staking.position.error;
  return <div className="space-y-6">
    <div><h2 className="text-2xl font-bold">Amnis</h2><p className="text-muted-foreground">Stake APT to receive reward-bearing stAPT. Unstaking returns amAPT first. Then request an APT withdrawal and claim when the withdrawal token unlocks.</p></div>
    <WalletSelectDialog open={walletOpen} onOpenChange={setWalletOpen} />
    {!staking.owner && <Button onClick={() => setWalletOpen(true)}>Connect Aptos Wallet</Button>}
    {staking.position.isLoading && <p role="status">Loading Amnis position…</p>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <Card><CardHeader><CardTitle>Your liquid stake</CardTitle></CardHeader><CardContent className="space-y-2">
      <p>Available: {position ? formatUnits(position.available, 8) : 'Unavailable'} APT</p>
      <p>Receipt balance: {position ? formatUnits(position.receipt, 8) : 'Unavailable'} stAPT</p>
      <p className="text-sm text-muted-foreground">stAPT accrues staking rewards through its exchange rate. Gas is paid in APT.</p>
    </CardContent></Card>
    <LiquidStakeForm stakeSymbol="APT" unstakeSymbol="stAPT" ready={ready} pending={staking.pending} onSubmit={(kind, amount) => void staking.execute({ kind, amount })} />
    <Card><CardHeader><CardTitle>Convert amAPT to APT</CardTitle></CardHeader><CardContent className="space-y-3">
      <p>Available: {position ? formatUnits(position.amapt, 8) : 'Unavailable'} amAPT</p>
      <p className="text-sm text-muted-foreground">amAPT does not earn staking rewards. Request a withdrawal below after unstaking your stAPT.</p>
      <Input aria-label="amAPT withdrawal amount" value={redeemAmount} disabled={staking.pending} onChange={(event) => setRedeemAmount(event.target.value)} placeholder="amAPT amount" />
      <Button disabled={!ready || staking.pending || !redeemAmount} onClick={() => void staking.execute({ kind: 'redeem', amount: redeemAmount })}>Request APT withdrawal</Button>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Withdrawal tickets</CardTitle></CardHeader><CardContent className="space-y-3">
      {position?.tickets.length === 0 && <p>No pending withdrawals.</p>}
      {position?.tickets.map((ticket) => <div key={ticket.address} className="flex items-center justify-between gap-4 border-b py-3">
        <div><p>{formatUnits(ticket.amount, 8)} APT</p><p className="text-sm text-muted-foreground">Unlock time: {new Date(Number(ticket.unlock) * 1000).toLocaleString()}</p></div>
        <Button disabled={!ready || staking.pending || ticket.unlock > position.timestamp} onClick={() => void staking.execute({ kind: 'claim', ticket: ticket.address })}>Claim APT</Button>
      </div>)}
      <p className="text-sm text-muted-foreground">The contract checks ticket readiness before signing. Withdrawal requests and claims require separate transactions.</p>
    </CardContent></Card>
    {staking.hash && <a className="block break-all underline" href={`https://explorer.aptoslabs.com/txn/${staking.hash}`} target="_blank" rel="noreferrer">{staking.confirmed ? 'Confirmed transaction' : 'Submitted transaction'}: {staking.hash}</a>}
    <a className="text-sm underline" href="https://docs.amnis.finance/" target="_blank" rel="noreferrer">Amnis protocol documentation</a>
  </div>;
}
