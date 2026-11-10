'use client';

import { useState } from 'react';
import { PoolStakingTabs } from '@/features/staking/PoolStakingTabs';
import { StakingTargetTable } from '@/features/staking/StakingTargetTable';
import { formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WalletSelectDialog } from '@/components/layout/WalletSelectDialog';
import { useIotaStaking } from './useIotaStaking';

const tokens = (amount: bigint | string) => formatUnits(BigInt(amount), 9);

export function IotaStakingView() {
  const staking = useIotaStaking();
  const [open, setOpen] = useState(false);
  const [validator, setValidator] = useState('');
  const [amount, setAmount] = useState('');
  const errors = [staking.validators.error, staking.positions.error, staking.balance.error, staking.yields.error].filter(Boolean);
  const transactionFeedback = (<>{staking.pending && <p role="status">Waiting for simulation, wallet approval, and transaction confirmation.</p>}{staking.error && <p role="alert" className="text-destructive">{staking.error}</p>}{staking.digest && <a className="block break-all underline" href={`https://explorer.iota.org/txblock/${staking.digest}?network=mainnet`} target="_blank" rel="noreferrer">{staking.confirmed ? 'Confirmed transaction' : 'Submitted transaction'}: {staking.digest}</a>}</>);
  return <div className="space-y-6">
    <h1 className="text-2xl font-bold">Staking</h1>
    <p className="text-sm text-muted-foreground">Stakes activate in the next epoch. Withdrawing returns both the principal and accumulated rewards.</p>
    <WalletSelectDialog open={open} onOpenChange={setOpen} />
    {!staking.owner && <Button onClick={() => setOpen(true)}>Connect IOTA Wallet</Button>}
    <p>Wallet balance: {staking.balance.data ? `${tokens(staking.balance.data.totalBalance)} IOTA` : 'Not loaded'}</p>
    {errors.map((error, index) => <p key={index} role="alert" className="text-destructive">{error?.message}</p>)}
    <PoolStakingTabs connected={!!staking.owner} pending={staking.pending}
      selection={<><StakingTargetTable targets={(staking.validators.data ?? []).map((item) => ({ id: item.address, name: item.name, details: <>Commission {(item.commission * 100).toFixed(2)}% · APY {staking.yields.data?.has(item.address) ? `${(staking.yields.data.get(item.address)! * 100).toFixed(2)}%` : 'Unavailable'}</> }))} value={validator} onSelect={setValidator} loading={staking.validators.isPending} error={staking.validators.error} pending={staking.pending}>
      <p className="text-xs text-muted-foreground">The annual percentage yield (APY) is a validator-specific estimate provided by the IOTA node.</p>
      <p className="break-all text-sm">Selected validator: {staking.validators.data?.find((item) => item.address === validator)?.name ?? 'None selected'}</p>
      <Input aria-label="Stake IOTA" placeholder="IOTA amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
      <Button disabled={!staking.owner || !validator || !amount || staking.pending} onClick={() => staking.execute({ kind: 'stake', validator, amount })}>Stake</Button>

      {transactionFeedback}
      </StakingTargetTable></>}
      positions={<>{staking.owner && <section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">My Stakes</h2>{staking.positions.isPending && <p>Loading</p>}{staking.positions.data?.length === 0 && <p>No staking positions.</p>}{staking.positions.data?.map((position) => <div key={position.objectId} className="border-b pb-3 space-y-2"><p>{staking.validators.data?.find((item) => item.address === position.validatorAddress)?.name ?? position.validatorAddress}</p><p>{tokens(position.principal)}  IOTA · Estimated rewards {tokens(position.rewards)} IOTA</p><p className="text-sm">{position.status === 'Pending' ? `Pending activation · Epoch ${position.activationEpoch}` : position.status === 'Active' ? 'Active' : 'Inactive'}</p><Button variant="outline" disabled={staking.pending || position.status === 'Pending'} onClick={() => staking.execute({ kind: 'withdraw', objectId: position.objectId })}>Withdraw Principal and Rewards</Button></div>)}</section>}</>}
    />
    {transactionFeedback}
  </div>;
}
