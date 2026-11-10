'use client';
import { useState } from 'react';
import { PoolStakingTabs } from '@/features/staking/PoolStakingTabs';
import { StakingTargetTable } from '@/features/staking/StakingTargetTable';
import { formatEther, parseEther } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WalletSelectDialog } from '@/components/layout/WalletSelectDialog';
import { iotexBucketState } from './state';
import { useIotexStaking } from './useIotexStaking';
export function IotexStakingView() {
  const staking = useIotexStaking();
  const [open, setOpen] = useState(false);
  const [candidate, setCandidate] = useState('');
  const [amount, setAmount] = useState('');
  const [days, setDays] = useState('7');
  const [autoStake, setAutoStake] = useState(false);
  const ready = staking.connected && staking.correctNetwork && !staking.pending;
  const errors = [staking.candidates.error, staking.balance.error, staking.buckets.error, staking.block.error].filter(Boolean);
  return <div className="space-y-6"><h1 className="text-2xl font-bold">IoTeX Native Staking</h1>
    <WalletSelectDialog open={open} onOpenChange={setOpen} />{(!staking.connected || !staking.correctNetwork) && <Button onClick={() => setOpen(true)}>Connect IoTeX Wallet</Button>}
    <p>Balance: {staking.balance.data !== undefined ? `${formatEther(staking.balance.data)} IOTX` : 'Not loaded'}</p>
    <p className="text-sm text-muted-foreground">Each stake has a lock period. After disabling auto-stake, wait for that period to end before unstaking. Withdrawal requires another 3 days after unstaking. This page manages native stakes and does not include NFT stakes.</p>
    {errors.map((error, index) => <p key={index} role="alert" className="text-destructive">{error?.message}</p>)}
    <PoolStakingTabs connected={!!staking.connected} pending={staking.pending}
      selection={<><section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">Delegate to a Validator</h2>{staking.candidates.isPending && <p>Loading validators</p>}
      <StakingTargetTable targets={(staking.candidates.data ?? []).filter((item) => item.selfStakingTokens >= parseEther('1200000')).map((item) => ({ id: item.name, name: item.name, details: <span className="break-all">{item.ownerAddress}</span> }))} value={candidate} onSelect={setCandidate} loading={staking.candidates.isPending} error={staking.candidates.error} pending={staking.pending} />
      <p className="text-xs text-muted-foreground">Validator yield rates and reward distribution terms are not available here. No estimated rate is shown without supporting data. Check your wallet balance for paid rewards.</p>
      <Input aria-label="IOTX stake amount" placeholder="Minimum 100 IOTX" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
      <label className="block">Stake duration (days)<Input aria-label="IoTeX stake duration" type="number" min={0} max={1050} value={days} onChange={(event) => setDays(event.target.value)} /></label>
      <label className="flex gap-2"><input type="checkbox" checked={autoStake} onChange={(event) => setAutoStake(event.target.checked)} />Auto-stake (the lock period does not decrease while enabled)</label>
      <Button disabled={!ready || !candidate || !amount || !days} onClick={() => staking.execute({ kind: 'stake', candidate, amount, days: Number(days), autoStake })}>Delegate</Button>
    </section></>}
      positions={<>{staking.connected && <section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">My Native Stakes</h2>{staking.buckets.isPending && <p>Loading</p>}{staking.buckets.data?.length === 0 && <p>No staking positions.</p>}{staking.buckets.data?.map((bucket) => {
      const state = staking.block.data ? iotexBucketState(bucket, staking.block.data.timestamp) : null;
      const name = staking.candidates.data?.find((item) => item.ownerAddress.toLowerCase() === bucket.candidateAddress.toLowerCase())?.name ?? bucket.candidateAddress;
      return <div key={bucket.index.toString()} className="border-b pb-3 space-y-2"><p className="break-all">#{bucket.index.toString()} · {name} · {formatEther(bucket.stakedAmount)} IOTX</p><p>{bucket.stakedDuration} days · {bucket.autoStake ? 'Auto-stake enabled' : state?.unstaked ? `Withdrawable at ${new Date(Number(state.withdrawAt) * 1000).toLocaleString()}` : state ? `Unstaking available at ${new Date(Number(state.maturity) * 1000).toLocaleString()}` : 'Loading status'}</p><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!ready || !bucket.autoStake || !state || state.unstaked} onClick={() => staking.execute({ kind: 'unlock', index: bucket.index })}>Disable Auto-stake</Button><Button variant="outline" disabled={!ready || !state?.canUnstake} onClick={() => staking.execute({ kind: 'unstake', index: bucket.index })}>Unstake</Button><Button disabled={!ready || !state?.canWithdraw} onClick={() => staking.execute({ kind: 'withdraw', index: bucket.index })}>Withdraw</Button></div></div>;
    })}</section>}</>}
    />
    {staking.pending && <p role="status">Waiting for wallet approval and transaction confirmation.</p>}{staking.error && <p role="alert" className="text-destructive">{staking.error}</p>}{staking.hash && <a className="block break-all underline" href={`https://iotexscan.io/tx/${staking.hash}`} target="_blank" rel="noreferrer">{staking.confirmed ? 'Confirmed transaction' : 'Submitted transaction'}</a>}
  </div>;
}
