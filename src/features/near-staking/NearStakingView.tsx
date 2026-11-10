'use client';
import { useState } from 'react';
import { PoolStakingTabs } from '@/features/staking/PoolStakingTabs';
import { StakingTargetTable } from '@/features/staking/StakingTargetTable';
import { formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WalletSelectDialog } from '@/components/layout/WalletSelectDialog';
import { useNearStaking } from './useNearStaking';
const tokens = (amount: bigint | string) => formatUnits(BigInt(amount), 24);
export function NearStakingView() {
  const [pool, setPool] = useState('');
  const staking = useNearStaking(pool);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const errors = [staking.validators.error, staking.positions.error, staking.balance.error, staking.apr.error, staking.poolInfo.error].filter(Boolean);
  const transactionFeedback = (<>{staking.pending && <p role="status">Waiting for wallet approval and transaction confirmation.</p>}{staking.error && <p role="alert" className="text-destructive">{staking.error}</p>}{staking.hash && <a className="block break-all underline" href={`https://nearblocks.io/txns/${staking.hash}`} target="_blank" rel="noreferrer">{staking.confirmed ? 'Confirmed transaction' : 'Submitted transaction'}: {staking.hash}</a>}</>);
  return <div className="space-y-6"><h1 className="text-2xl font-bold">Staking</h1><p className="text-sm text-muted-foreground">Rewards are included in the staked balance. Unstaking usually takes 4 epochs; the pool contract determines when withdrawal is available.</p>
    <WalletSelectDialog open={open} onOpenChange={setOpen} />{!staking.owner && <Button onClick={() => setOpen(true)}>Connect NEAR Wallet</Button>}
    <p>Balance excluding storage deposit: {staking.balance.data !== undefined ? `${tokens(staking.balance.data)} NEAR` : 'Not loaded'}</p>
    {errors.map((error, index) => <p key={index} role="alert" className="text-destructive">{error?.message}</p>)}
    <PoolStakingTabs connected={!!staking.owner} pending={staking.pending}
      selection={<><StakingTargetTable targets={(staking.validators.data ?? []).filter((item) => !item.is_slashed).map((item) => ({ id: item.account_id, name: item.account_id, details: 'Select to load pool commission and current APR.' }))} value={pool} onSelect={setPool} loading={staking.validators.isPending} error={staking.validators.error} pending={staking.pending}>
      {staking.poolInfo.data && <p>Commission {(staking.poolInfo.data.commission * 100).toFixed(2)}% · Estimated APR {staking.apr.data !== undefined ? `${(staking.apr.data * (1 - staking.poolInfo.data.commission) * 100).toFixed(2)}%` : 'Unavailable'}{staking.poolInfo.data.paused && ' · Staking paused'}</p>}
      <p className="text-xs text-muted-foreground">The annual percentage rate (APR) is calculated from the current maximum issuance rate, total stake, and pool commission. Actual rewards depend on validator performance. Staking is unavailable if the selected pool configuration cannot be loaded.</p>
      <Input aria-label="NEAR amount" placeholder="NEAR amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /><Button disabled={!staking.owner || !pool || !amount || staking.pending || !staking.poolInfo.data || staking.poolInfo.data.paused} onClick={() => staking.execute({ kind: 'stake', pool, amount })}>Stake</Button>

      {transactionFeedback}
      </StakingTargetTable></>}
      positions={<><label className="block text-sm">Action amount<Input aria-label="Unstaking or withdrawal amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>{staking.owner && <section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">My Stakes</h2><p className="text-sm">Enter the amount for your action in the amount field above.</p>{staking.positions.isPending && <p>Loading</p>}{staking.positions.data?.length === 0 && <p>No staking positions.</p>}{staking.positions.data?.map((position) => <div key={position.pool} className="border-b pb-3 space-y-2"><p>{position.pool}</p><p>Staked {tokens(position.staked)} · {position.canWithdraw ? 'Withdrawable' : 'Unstaking'} {tokens(position.unstaked)} NEAR</p><div className="flex gap-2"><Button variant="outline" disabled={staking.pending || !amount || position.staked === BigInt(0)} onClick={() => staking.execute({ kind: 'unstake', pool: position.pool, amount })}>Request Unstake</Button><Button variant="outline" disabled={staking.pending || !amount || !position.canWithdraw || position.unstaked === BigInt(0)} onClick={() => staking.execute({ kind: 'withdraw', pool: position.pool, amount })}>Withdraw</Button></div></div>)}</section>}</>}
    />
    {transactionFeedback}
  </div>;
}
