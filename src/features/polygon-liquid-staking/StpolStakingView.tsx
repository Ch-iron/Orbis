'use client';

import { useState } from 'react';
import { formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WalletSelectDialog } from '@/components/layout/WalletSelectDialog';
import { LiquidStakeForm } from '@/features/liquid-staking/LiquidStakeForm';
import { useStpolStaking } from './useStpolStaking';

export function StpolStakingView() {
  const staking = useStpolStaking();
  const [walletOpen, setWalletOpen] = useState(false);
  const position = staking.position.data;
  const error = staking.error ?? staking.position.error?.message;
  const ready = !!staking.connected && !!position && !staking.position.error && staking.correctNetwork;
  return <div className="space-y-6">
    <div><h2 className="text-2xl font-bold">stake.link</h2><p className="text-muted-foreground">Stake POL on Ethereum to receive stPOL. Withdrawals are paid immediately when liquidity is available or enter the protocol queue. Gas is paid in ETH.</p></div>
    <WalletSelectDialog open={walletOpen} onOpenChange={setWalletOpen} />
    {(!staking.connected || !staking.correctNetwork) && <Button onClick={() => setWalletOpen(true)}>Connect Ethereum Wallet</Button>}
    {staking.position.isLoading && <p role="status">Loading stake.link position…</p>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <Card><CardHeader><CardTitle>Your liquid stake</CardTitle></CardHeader><CardContent className="space-y-2">
      <p>Available: {position ? formatUnits(position.available, 18) : 'Unavailable'} POL</p>
      <p>Direct deposit capacity: {position ? formatUnits(position.capacity, 18) : 'Unavailable'} POL</p>
      <p>Receipt balance: {position ? formatUnits(position.receipt, 18) : 'Unavailable'} stPOL</p>
      <p className="text-sm text-muted-foreground">stPOL rewards are reflected in its rebasing balance. Deposits and withdrawals may require token approval.</p>
    </CardContent></Card>
    <LiquidStakeForm stakeSymbol="POL" unstakeSymbol="stPOL" ready={ready} pending={staking.pending} onSubmit={(kind, amount) => void staking.execute({ kind, amount })} />
    <Card><CardHeader><CardTitle>Redemption queue</CardTitle></CardHeader><CardContent className="space-y-3">
      <p>Minimum withdrawal: {position ? formatUnits(position.minimumWithdrawal, 18) : 'Unavailable'} POL</p>
      <p>Awaiting processing: {position ? formatUnits(position.pending, 18) : 'Unavailable'} POL</p>
      <p>Claimable: {position ? formatUnits(position.claimable, 18) : 'Unavailable'} POL</p>
      <Button disabled={!ready || staking.pending || !position || position.claimable === BigInt(0)} onClick={() => void staking.execute({ kind: 'claim' })}>Claim POL</Button>
      <p className="text-sm text-muted-foreground">Direct deposits do not join the deposit queue. If capacity changes before execution, unprocessed POL is returned. Withdrawal completion depends on protocol liquidity.</p>
    </CardContent></Card>
    {staking.hash && <a className="block break-all underline" href={`https://etherscan.io/tx/${staking.hash}`} target="_blank" rel="noreferrer">{staking.confirmed ? 'Confirmed transaction' : 'Submitted transaction'}: {staking.hash}</a>}
    <a className="text-sm underline" href="https://docs.stake.link/products/stpol/" target="_blank" rel="noreferrer">stake.link protocol documentation</a>
  </div>;
}
