'use client';

import { useState } from 'react';
import { formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WalletSelectDialog } from '@/components/layout/WalletSelectDialog';
import { LiquidStakeForm } from '@/features/liquid-staking/LiquidStakeForm';
import { useBedrockStaking } from './useBedrockStaking';

export function BedrockStakingView() {
  const staking = useBedrockStaking();
  const [walletOpen, setWalletOpen] = useState(false);
  const position = staking.position.data;
  const error = staking.error ?? staking.position.error?.message;
  const ready = !!staking.connected && !!position && !staking.position.error && staking.correctNetwork;
  return <div className="space-y-6">
    <div><h2 className="text-2xl font-bold">Bedrock</h2><p className="text-muted-foreground">Stake IOTX to receive uniIOTX. Enter the IOTX value to redeem, then claim after the protocol processes your request.</p></div>
    <WalletSelectDialog open={walletOpen} onOpenChange={setWalletOpen} />
    {(!staking.connected || !staking.correctNetwork) && <Button onClick={() => setWalletOpen(true)}>Connect IoTeX Wallet</Button>}
    {staking.position.isLoading && <p role="status">Loading Bedrock position…</p>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <Card><CardHeader><CardTitle>Your liquid stake</CardTitle></CardHeader><CardContent className="space-y-2">
      <p>Available: {position ? formatUnits(position.available, 18) : 'Unavailable'} IOTX</p>
      <p>Receipt balance: {position ? formatUnits(position.receipt, 18) : 'Unavailable'} uniIOTX</p>
      <p>1 uniIOTX = {position ? formatUnits(position.rate, 18) : 'Unavailable'} IOTX</p>
      <p className="text-sm text-muted-foreground">uniIOTX accrues staking rewards through its exchange rate. Gas is paid in IOTX.</p>
    </CardContent></Card>
    <LiquidStakeForm stakeSymbol="IOTX" unstakeSymbol="IOTX value" ready={ready} pending={staking.pending} onSubmit={(kind, amount) => void staking.execute({ kind, amount })} />
    <Card><CardHeader><CardTitle>Redemption queue</CardTitle></CardHeader><CardContent className="space-y-3">
      <p>Redemption increment: {position ? formatUnits(position.redeemBase, 18) : 'Unavailable'} IOTX</p>
      <p>Awaiting processing: {position ? formatUnits(position.debt, 18) : 'Unavailable'} IOTX</p>
      <p>Claimable: {position ? formatUnits(position.claimable, 18) : 'Unavailable'} IOTX</p>
      <Button disabled={!ready || staking.pending || !position || position.clearPaused || position.claimable === BigInt(0)} onClick={() => void staking.execute({ kind: 'claim' })}>Claim IOTX</Button>
      <p className="text-sm text-muted-foreground">Redemption burns uniIOTX at the current exchange rate and joins the protocol queue. A token approval may be required before redemption. The claimable balance can include rewards earned while waiting.</p>
    </CardContent></Card>
    {staking.hash && <a className="block break-all underline" href={`https://iotexscan.io/tx/${staking.hash}`} target="_blank" rel="noreferrer">{staking.confirmed ? 'Confirmed transaction' : 'Submitted transaction'}: {staking.hash}</a>}
    <a className="text-sm underline" href="https://docs.bedrock.technology/multi-asset-liquid-staking/uniiotx" target="_blank" rel="noreferrer">Bedrock protocol documentation</a>
  </div>;
}
