'use client';

import { formatEther } from 'viem';
import { avalanche } from 'viem/chains';
import { useAccount, useSwitchChain } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LiquidStakeForm } from '@/features/liquid-staking/LiquidStakeForm';
import { useBenqiStaking } from './useBenqiStaking';

export function BenqiStakingView() {
  const staking = useBenqiStaking();
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { switchChain, error: networkError } = useSwitchChain();
  const setWalletType = useWalletTypeStore((state) => state.setWalletType);
  const position = staking.position.data;
  const error = staking.error ?? staking.position.error?.message ?? networkError?.message;
  const ready = staking.connected && staking.correctNetwork && !!position && !staking.position.error;
  return <div className="space-y-6">
    <div><h2 className="text-2xl font-bold">BENQI</h2><p className="text-muted-foreground">Stake AVAX on Avalanche C-Chain to receive sAVAX. P-Chain staking and balances are separate.</p></div>
    {(!staking.connected || !staking.correctNetwork) && <Button onClick={() => { setWalletType('evm'); if (isConnected) switchChain({ chainId: avalanche.id }); else openConnectModal?.(); }}>Connect Avalanche C-Chain Wallet</Button>}
    {staking.position.isLoading && <p role="status">Loading BENQI position…</p>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <Card><CardHeader><CardTitle>Your liquid stake</CardTitle></CardHeader><CardContent className="space-y-2">
      <p>Available: {position ? formatEther(position.available) : 'Unavailable'} AVAX</p>
      <p>Receipt balance: {position ? formatEther(position.receipt) : 'Unavailable'} sAVAX</p>
      <p>1 sAVAX = {position ? formatEther(position.rate) : 'Unavailable'} AVAX</p>
      <p className="text-sm text-muted-foreground">Contract cooldown: {position ? `${Number(position.cooldown) / 86400} days` : 'Unavailable'}. Claim window: {position ? `${Number(position.redeemPeriod) / 86400} days` : 'Unavailable'}.</p>
    </CardContent></Card>
    <LiquidStakeForm stakeSymbol="AVAX" unstakeSymbol="sAVAX" ready={ready} pending={staking.pending} onSubmit={(kind, amount) => void staking.execute({ kind, amount })} />
    <Card><CardHeader><CardTitle>Contract withdrawal requests</CardTitle></CardHeader><CardContent className="space-y-3">
      {position?.withdrawals.length === 0 && <p>No pending withdrawals.</p>}
      {position?.withdrawals.map((request) => <div key={`${request.id}-${request.startedAt}`} className="space-y-2 border-b py-3">
        <p>{formatEther(request.shares)} sAVAX</p>
        <p className="text-sm">Unlocks after {new Date(Number(request.unlock) * 1000).toLocaleString()}. Claim by {new Date(Number(request.expires) * 1000).toLocaleString()}.</p>
        <Button disabled={!ready || staking.pending || !request.ready} onClick={() => void staking.execute({ kind: 'claim', ...request })}>Claim AVAX</Button>
        {request.expired && <Button variant="outline" disabled={!ready || staking.pending} onClick={() => void staking.execute({ kind: 'cancel', ...request })}>Recover sAVAX</Button>}
      </div>)}
      <p className="text-sm text-muted-foreground">These requests use the sAVAX contract cooldown and claim window. Expired requests can return sAVAX, which can be submitted for withdrawal again.</p>
    </CardContent></Card>
    {staking.hash && <a className="block break-all underline" href={`https://snowtrace.io/tx/${staking.hash}`} target="_blank" rel="noreferrer">{staking.confirmed ? 'Confirmed transaction' : 'Submitted transaction'}: {staking.hash}</a>}
    <a className="text-sm underline" href="https://docs.benqi.fi/resources/contracts/liquid-staking" target="_blank" rel="noreferrer">BENQI protocol contracts</a>
  </div>;
}
