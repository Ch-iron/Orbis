'use client';

import { useState } from 'react';
import { formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WalletSelectDialog } from '@/components/layout/WalletSelectDialog';
import { LiquidStakeForm } from '@/features/liquid-staking/LiquidStakeForm';
import { useLinearStaking } from './useLinearStaking';

export function LinearStakingView() {
  const staking = useLinearStaking();
  const [walletOpen, setWalletOpen] = useState(false);
  const position = staking.position.data;
  const error = staking.error ?? staking.position.error?.message;
  const tokens = (amount: bigint | undefined) => amount === undefined ? 'Unavailable' : formatUnits(amount, 24);
  return <div className="space-y-6">
    <div><h2 className="text-2xl font-bold">LiNEAR</h2><p className="text-muted-foreground">Stake NEAR to receive LiNEAR. Rewards increase the NEAR value of each token. Unstaking amounts are entered in NEAR value, not LiNEAR tokens.</p></div>
    <WalletSelectDialog open={walletOpen} onOpenChange={setWalletOpen} />
    {!staking.owner && <Button onClick={() => setWalletOpen(true)}>Connect NEAR Wallet</Button>}
    {staking.position.isLoading && <p role="status">Loading LiNEAR position…</p>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <Card><CardHeader><CardTitle>Your liquid stake</CardTitle></CardHeader><CardContent className="space-y-2">
      <p>Available: {tokens(position?.available)} NEAR</p>
      <p>Receipt balance: {tokens(position?.receipt)} LiNEAR</p>
      <p>Staked value: {tokens(position?.staked)} NEAR</p>
      <p>1 LiNEAR = {tokens(position?.price)} NEAR</p>
      {position?.paused && <p role="alert">LiNEAR operations are paused.</p>}
    </CardContent></Card>
    <LiquidStakeForm stakeSymbol="NEAR" unstakeSymbol="NEAR value" ready={!!staking.owner && !!position && !position.paused && !staking.position.error} pending={staking.pending} onSubmit={(kind, amount) => void staking.execute({ kind, amount })} />
    <Card><CardHeader><CardTitle>Withdrawal</CardTitle></CardHeader><CardContent className="space-y-3">
      <p>{tokens(position?.unstaked)} NEAR {position?.canWithdraw ? 'available to withdraw' : 'awaiting release'}</p>
      <p className="text-sm text-muted-foreground">The contract determines when unstaked NEAR becomes available. Further unstaking can extend the waiting period for your pending balance.</p>
      <Button disabled={!position?.canWithdraw || position.unstaked === BigInt(0) || staking.pending || position.paused || !!staking.position.error} onClick={() => { if (position) void staking.execute({ kind: 'withdraw', amount: formatUnits(position.unstaked, 24) }); }}>Withdraw available NEAR</Button>
    </CardContent></Card>
    {staking.hash && <a className="block break-all underline" href={`https://nearblocks.io/txns/${staking.hash}`} target="_blank" rel="noreferrer">{staking.confirmed ? 'Confirmed transaction' : 'Submitted transaction'}: {staking.hash}</a>}
    <a className="text-sm underline" href="https://docs.linearprotocol.org/developer-guide/contract-overview" target="_blank" rel="noreferrer">LiNEAR protocol documentation</a>
  </div>;
}
