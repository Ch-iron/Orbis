'use client';

import { useState } from 'react';
import { formatUnits } from 'viem';
import type { Address } from 'viem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WalletSelectDialog } from '@/components/layout/WalletSelectDialog';
import { LiquidStakeForm } from '@/features/liquid-staking/LiquidStakeForm';
import { StakingTargetTable } from '@/features/staking/StakingTargetTable';
import { useLairStaking } from './useLairStaking';

export function LairStakingView() {
  const staking = useLairStaking();
  const [walletOpen, setWalletOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState('');
  const position = staking.position.data;
  const node = position?.nodes.find((item) => item.node === selectedNode);
  const ready = !!staking.connected && !!position && !staking.position.error && staking.correctNetwork;
  const error = staking.error ?? staking.position.error?.message;
  return <div className="space-y-6">
    <div><h2 className="text-2xl font-bold">Lair · stKAIA</h2><p className="text-muted-foreground">Choose a governance council node to stake KAIA or request a stKAIA withdrawal. Withdrawals normally require a seven-day wait and a separate claim.</p></div>
    <WalletSelectDialog open={walletOpen} onOpenChange={setWalletOpen} />
    {(!staking.connected || !staking.correctNetwork) && <Button onClick={() => setWalletOpen(true)}>Connect Kaia EVM Wallet</Button>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <Card><CardHeader><CardTitle>Your liquid stake</CardTitle></CardHeader><CardContent className="space-y-2">
      <p>Available: {position ? formatUnits(position.available, 18) : 'Unavailable'} KAIA</p>
      <p>Receipt balance: {position ? formatUnits(position.receipt, 18) : 'Unavailable'} stKAIA</p>
      <p>1 stKAIA = {position ? formatUnits(position.rate, 18) : 'Unavailable'} KAIA</p>
    </CardContent></Card>
    <StakingTargetTable targets={(position?.nodes ?? []).map((item) => ({ id: item.node, name: `GC node ${item.index.toString()}`, details: item.isActive ? 'Active' : 'Withdrawals only' }))} value={selectedNode} onSelect={setSelectedNode} loading={staking.position.isLoading} error={staking.position.error} pending={staking.pending} />
    <LiquidStakeForm stakeSymbol="KAIA" unstakeSymbol="stKAIA" ready={ready && !!node && !position?.paused} pending={staking.pending} onSubmit={(kind, amount) => void staking.execute({ kind, amount, node: selectedNode as Address })} />
    <Card><CardHeader><CardTitle>Withdrawal requests</CardTitle></CardHeader><CardContent className="space-y-3">
      {position?.withdrawals.length === 0 && <p>No pending withdrawals.</p>}
      {position?.withdrawals.map((request) => <div key={request.index.toString()} className="flex items-center justify-between gap-4 rounded-lg border p-3">
        <div><p>{formatUnits(request.amount, 18)} KAIA</p><p className="text-sm text-muted-foreground">{request.ready ? 'Ready to claim' : `Expected after ${new Date(Number(request.unlockAt) * 1000).toLocaleString()}`}</p></div>
        <Button disabled={!ready || staking.pending || !request.ready} onClick={() => void staking.execute({ kind: 'claim', index: request.index })}>Claim</Button>
      </div>)}
      <p className="text-sm text-muted-foreground">The selected node must have sufficient capacity for the withdrawal. The contract checks availability before signing. Expired or cancelled requests follow the protocol recovery rules.</p>
    </CardContent></Card>
    {staking.hash && <a className="block break-all underline" href={`https://kaiascan.io/tx/${staking.hash}`} target="_blank" rel="noreferrer">{staking.confirmed ? 'Confirmed transaction' : 'Submitted transaction'}: {staking.hash}</a>}
    <a className="text-sm underline" href="https://lair-finance.gitbook.io/lair-finance/liquid-staking/unstake-and-claim" target="_blank" rel="noreferrer">Lair withdrawal documentation</a>
  </div>;
}
