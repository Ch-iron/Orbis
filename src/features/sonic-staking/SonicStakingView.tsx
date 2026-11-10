'use client';

import { useState } from 'react';
import { PoolStakingTabs } from '@/features/staking/PoolStakingTabs';
import { StakingTargetTable } from '@/features/staking/StakingTargetTable';
import { formatEther } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WalletSelectDialog } from '@/components/layout/WalletSelectDialog';
import { useSonicStaking } from './useSonicStaking';

export function SonicStakingView() {
  const staking = useSonicStaking();
  const [open, setOpen] = useState(false);
  const [validatorId, setValidatorId] = useState('');
  const [amount, setAmount] = useState('');
  const [operation, setOperation] = useState<'delegate' | 'undelegate'>('delegate');
  const name = (id: bigint) => staking.names.data?.get(id.toString()) ?? `Validator #${id}`;
  const errors = [staking.validators.error, staking.balance.error, staking.positions.error, staking.withdrawals.error, staking.parameters.error].filter(Boolean);
  return <div className="space-y-6">
    <h1 className="text-2xl font-bold">Sonic Staking</h1>
    <WalletSelectDialog open={open} onOpenChange={setOpen} />
    {(!staking.connected || !staking.correctNetwork) && <Button onClick={() => setOpen(true)}>Connect Sonic Wallet</Button>}
    <p>Wallet balance: {staking.balance.data !== undefined ? `${formatEther(staking.balance.data)} S` : 'Not loaded'}</p>
    <p className="text-sm text-muted-foreground">Unstaking wait: {staking.parameters.data ? `${Number(staking.parameters.data.seconds) / 86400} days and ${staking.parameters.data.epochs} epochs` : 'Loading'}. Both conditions must be met before withdrawal.</p>
    {errors.map((error, index) => <p key={index} role="alert" className="text-destructive">{error?.message}</p>)}
    <PoolStakingTabs connected={!!staking.connected} pending={staking.pending}
      selection={<><section className="rounded-xl border p-4 space-y-4">
      <h2 className="font-semibold">Validator</h2>
      {staking.validators.isPending && <p>Loading validators</p>}
      <StakingTargetTable targets={(staking.validators.data ?? []).filter((item) => item.status === BigInt(0)).map((item) => ({ id: item.id.toString(), name: name(item.id), details: <>Commission {(item.commission * 100).toFixed(2)}% · APR {staking.apr.data !== undefined ? `${(staking.apr.data * (1 - item.commission) * 100).toFixed(2)}%` : 'Unavailable'}</> }))} value={validatorId} onSelect={setValidatorId} loading={staking.validators.isPending} error={staking.validators.error} pending={staking.pending} />
      <p className="text-xs text-muted-foreground">The annual percentage rate (APR) is estimated from the official network rate after current commission. Actual returns depend on validator performance.</p>
      <div className="flex gap-2"><Button variant={operation === 'delegate' ? 'default' : 'outline'} onClick={() => setOperation('delegate')}>Delegate</Button><Button variant={operation === 'undelegate' ? 'default' : 'outline'} onClick={() => setOperation('undelegate')}>Unstake</Button></div>
      <p>Selected validator: {validatorId || 'None selected'}</p><Input aria-label="S amount" placeholder="S amount" value={amount} onChange={(event) => setAmount(event.target.value)} />
      <Button disabled={!staking.connected || !staking.correctNetwork || staking.pending || !validatorId || !amount} onClick={() => staking.execute({ kind: operation, validatorId: BigInt(validatorId), amount, ...(operation === 'undelegate' ? { requestId: BigInt(`0x${crypto.randomUUID().replaceAll('-', '')}`) } : {}) })}>{operation === 'delegate' ? 'Delegate' : 'Request Unstake'}</Button>
    </section></>}
      positions={<>{staking.connected && <section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">My Stakes and Rewards</h2>{staking.positions.isPending && <p>Loading</p>}{staking.positions.data?.filter((position) => position.amount > BigInt(0) || position.rewards > BigInt(0)).map((position) => <div key={position.id.toString()} className="border-b pb-3 space-y-2"><p>{name(position.id)} · {formatEther(position.amount)} S</p><p>Rewards: {formatEther(position.rewards)} S</p><div className="flex gap-2"><Button disabled={staking.pending || !staking.correctNetwork || position.rewards === BigInt(0)} onClick={() => staking.execute({ kind: 'claimRewards', validatorId: position.id })}>Claim Rewards</Button><Button variant="outline" disabled={staking.pending || !staking.correctNetwork || position.rewards === BigInt(0)} onClick={() => staking.execute({ kind: 'restakeRewards', validatorId: position.id })}>Redelegate Rewards</Button></div></div>)}</section>}
{staking.connected && <section className="rounded-xl border p-4 space-y-3"><h2 className="font-semibold">Withdrawal Requests</h2>{staking.withdrawals.isPending && <p>Loading</p>}{staking.withdrawals.data?.length === 0 && <p>No withdrawal requests.</p>}{staking.withdrawals.data?.map((request) => <div key={`${request.validatorId}-${request.requestId}`} className="space-y-2"><p>{name(request.validatorId)} · {formatEther(request.amount)} S</p><p className="text-sm">{new Date(Number(request.unlockTime) * 1000).toLocaleString()}  and epoch {request.unlockEpoch.toString()}  must both be reached before withdrawal</p><Button disabled={!request.ready || staking.pending || !staking.correctNetwork} onClick={() => staking.execute({ kind: 'withdraw', validatorId: request.validatorId, requestId: request.requestId })}>Withdraw</Button></div>)}</section>}</>}
    />
    {staking.pending && <p role="status">Waiting for wallet approval and transaction confirmation.</p>}{staking.error && <p role="alert" className="text-destructive">{staking.error}</p>}{staking.hash && <a className="block break-all underline" href={`https://sonicscan.org/tx/${staking.hash}`} target="_blank" rel="noreferrer">{staking.confirmed ? 'Confirmed transaction' : 'Submitted transaction'}: {staking.hash}</a>}
  </div>;
}
