'use client';
import { useState } from 'react';
import { PoolStakingTabs } from '@/features/staking/PoolStakingTabs';
import { StakingTargetTable } from '@/features/staking/StakingTargetTable';
import { formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WalletSelectDialog } from '@/components/layout/WalletSelectDialog';
import { useAptosStaking } from './useAptosStaking';
const tokens = (amount: bigint | string) => formatUnits(BigInt(amount), 8);
export function AptosStakingView() {
  const staking = useAptosStaking();
  const [open, setOpen] = useState(false);
  const [pool, setPool] = useState('');
  const [amount, setAmount] = useState('');
  const errors = [staking.validators.error, staking.positions.error, staking.balance.error, staking.apr.error].filter(Boolean);
  return <div className="space-y-6"><h1 className="text-2xl font-bold">Aptos Staking</h1>
    <p className="text-sm text-muted-foreground">Rewards are included in the staked balance. After requesting an unstake, you can withdraw when the pool lock expires. Minimum balance requirements are checked through contract simulation before signing.</p>
    <WalletSelectDialog open={open} onOpenChange={setOpen} />{!staking.owner && <Button onClick={() => setOpen(true)}>Connect Aptos Wallet</Button>}
    <p>Wallet balance: {staking.balance.data !== undefined ? `${tokens(staking.balance.data)} APT` : 'Not loaded'}</p>
    {errors.map((error, index) => <p key={index} role="alert" className="text-destructive">{error?.message}</p>)}
    <PoolStakingTabs connected={!!staking.owner} pending={staking.pending}
      selection={<><section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">Select a Delegation Pool</h2>{staking.validators.isPending && <p>Loading</p>}
      <StakingTargetTable targets={(staking.validators.data ?? []).filter((item) => item.status === 'active').map((item) => ({ id: item.address, name: item.name, details: <>Commission {(item.commission * 100).toFixed(2)}% · Estimated APR {staking.apr.data !== undefined ? `${(staking.apr.data * (1 - item.commission) * 100).toFixed(2)}%` : 'Unavailable'}</> }))} value={pool} onSelect={setPool} loading={staking.validators.isPending} error={staking.validators.error} pending={staking.pending} />
      <p className="text-xs text-muted-foreground">The annual percentage rate (APR) is estimated from the current epoch reward rate, epoch duration, and pool commission. Actual rewards depend on validator performance.</p>
      <Input aria-label="APT amount" placeholder="APT amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
      <Button disabled={!staking.owner || !pool || !amount || staking.pending} onClick={() => staking.execute({ kind: 'add_stake', pool, amount })}>Stake</Button>
    </section></>}
      positions={<><label className="block text-sm">Action amount<Input aria-label="Unstaking or withdrawal amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>{staking.owner && <section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">My Stakes</h2><p className="text-sm">Enter the amount for your action in the amount field above.</p>{staking.positions.isPending && <p>Loading</p>}{staking.positions.data?.length === 0 && <p>No staking positions.</p>}{staking.positions.data?.map((position) => <div key={position.pool} className="border-b pb-3 space-y-2"><p className="break-all">{position.pool}</p><p>Active {tokens(position.active)}  · Unstaking {tokens(position.pending)}  · Withdrawable {tokens(position.inactive)} APT</p><p className="text-sm">Current pool lock expires: {position.unlockAt.toLocaleString()}</p><div className="flex flex-wrap gap-2">{([{ kind: 'unlock', label: 'Request Unstake', available: position.active }, { kind: 'reactivate_stake', label: 'Cancel Unstake', available: position.pending }, { kind: 'withdraw', label: 'Withdraw', available: position.inactive }] as const).map((action) => <Button key={action.kind} variant="outline" disabled={staking.pending || !amount || action.available === BigInt(0)} onClick={() => staking.execute({ kind: action.kind, pool: position.pool, amount })}>{action.label}</Button>)}</div></div>)}</section>}</>}
    />
    {staking.pending && <p role="status">Waiting for simulation, wallet approval, and transaction confirmation.</p>}{staking.error && <p role="alert" className="text-destructive">{staking.error}</p>}{staking.hash && <a className="block break-all underline" href={`https://explorer.aptoslabs.com/txn/${staking.hash}?network=mainnet`} target="_blank" rel="noreferrer">{staking.confirmed ? 'Confirmed transaction' : 'Submitted transaction'}: {staking.hash}</a>}
  </div>;
}
