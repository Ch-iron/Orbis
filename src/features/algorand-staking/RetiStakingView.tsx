'use client';

import { useState } from 'react';
import { StakingTargetTable } from '@/features/staking/StakingTargetTable';
import { PoolStakingTabs } from '@/features/staking/PoolStakingTabs';
import { formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WalletSelectDialog } from '@/components/layout/WalletSelectDialog';
import { useRetiStaking, useRetiPoolYield } from './useRetiStaking';

const algo = (value: bigint) => formatUnits(value, 6);

export function RetiStakingView() {
  const staking = useRetiStaking();
  const [walletOpen, setWalletOpen] = useState(false);
  const [selected, setSelected] = useState('');
  const [amount, setAmount] = useState('');
  const [withdrawPool, setWithdrawPool] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const validator = staking.validators.data?.find((item) => item.id.toString() === selected);
  const errors = [staking.validators.error, staking.account.error, staking.positions.error, staking.registration.error].filter(Boolean);
  const transactionFeedback = (<>{staking.pending && <p role="status">Waiting for transaction validation, wallet approval, and confirmation.</p>}
    {staking.error && <p role="alert" className="text-destructive">{staking.error}</p>}
    {staking.txIds.length > 0 && <div><p>Transaction confirmed</p>{staking.txIds.map((id) => <a className="block break-all text-sm underline" key={id} href={`https://allo.info/tx/${id}`} target="_blank" rel="noreferrer">{id}</a>)}</div>}</>);
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold">Staking</h1><p className="text-sm text-muted-foreground">Select a validator to stake ALGO. ALGO rewards are included in the staked balance.</p></div>
    {!staking.owner && <Button onClick={() => setWalletOpen(true)}>Connect Algorand Wallet</Button>}
    <WalletSelectDialog open={walletOpen} onOpenChange={setWalletOpen} />
    {errors.map((error, i) => <p key={i} role="alert" className="text-destructive">Request failed: {error?.message}</p>)}
    {staking.owner && <div className="rounded-xl border p-4 space-y-2">
      <p className="break-all text-sm">{staking.owner}</p>
      <p>Wallet balance: {staking.account.data ? `${algo(staking.account.data.amount)} ALGO` : 'Loading'}</p>
      <p>Minimum account balance: {staking.account.data ? `${algo(staking.account.data.minimumBalance)} ALGO` : 'Loading'}</p>
      <p>Réti registration cost: {staking.registration.data !== undefined ? `${algo(staking.registration.data)} ALGO` : 'Loading'}</p>
    </div>}
    <PoolStakingTabs connected={!!staking.owner} pending={staking.pending}
      selection={<StakingTargetTable
        targets={(staking.validators.data ?? []).map((item) => ({ id: item.id.toString(), name: `#${item.id} · ${item.owner}`, details: <>Commission {(item.commission * 100).toFixed(2)}% · Minimum {algo(item.minimum)} ALGO{item.gatingType !== 0 && ' · Asset holding requirement'}</> }))}
        value={selected} onSelect={setSelected} loading={staking.validators.isPending} error={staking.validators.error} pending={staking.pending}>
      {validator && <div className="space-y-3"><h3>Validator #{selected} pools</h3>
        {validator.pools.map((pool) => <PoolYield key={pool.appId.toString()} appId={pool.appId} balance={pool.balance} />)}
        <p className="text-xs text-muted-foreground">The annual percentage yield (APY) is a Nodely pool metric used by Réti. The contract assigns the actual staking pool.</p>
        {validator.gatingType !== 0 && <p>This validator requires holding a specific asset. Stake through the official Réti app.</p>}
        <Input aria-label="Stake ALGO" placeholder="ALGO amount to stake" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
        <p className="text-xs text-muted-foreground">Your first stake also requires the registration cost above and transaction fees. If bonus token registration is required, another 0.1 ALGO is added to the minimum account balance.</p>
        <Button disabled={!staking.owner || staking.pending || validator.gatingType !== 0 || !amount} onClick={() => staking.execute({ kind: 'deposit', validatorId: validator.id, amount })}>Stake</Button>
      </div>}
      {transactionFeedback}
    </StakingTargetTable>}
      positions={<>{staking.owner && <section className="rounded-xl border p-4 space-y-4">
      <h2 className="text-lg font-semibold">My Stakes and Withdrawals</h2>
      {staking.positions.isPending && <p>Loading staking positions</p>}
      {staking.positions.data?.length === 0 && <p>No Réti staking positions.</p>}
      {staking.positions.data?.map((position) => <div key={position.poolAppId.toString()} className="border-b pb-3 space-y-1"><p>Validator #{position.validatorId.toString()}  · Pool {position.poolAppId.toString()}</p><p>{algo(position.balance)} ALGO</p><p className="text-sm text-muted-foreground">Accumulated ALGO rewards: {algo(position.totalRewarded)}</p>{position.rewardTokenBalance > BigInt(0) && <p className="text-sm">Bonus token rewards are also available and will be received on withdrawal.</p>}<Button size="sm" variant="outline" onClick={() => { setWithdrawPool(position.poolAppId.toString()); setWithdrawAmount(algo(position.balance)); }}>Enter Full Withdrawal Amount</Button></div>)}
      {withdrawPool && <><p>Pool to withdraw from: {withdrawPool}</p><Input aria-label="Withdraw ALGO" inputMode="decimal" value={withdrawAmount} onChange={(event) => setWithdrawAmount(event.target.value)} /><Button disabled={staking.pending || !withdrawAmount} onClick={() => staking.execute({ kind: 'withdraw', poolAppId: BigInt(withdrawPool), amount: withdrawAmount })}>Withdraw</Button></>}
    </section>}</>}
    />
    {transactionFeedback}
  </div>;
}

function PoolYield({ appId, balance }: { appId: bigint; balance: bigint }) {
  const query = useRetiPoolYield(appId);
  return <div className="text-sm">Pool {appId.toString()} · {algo(balance)} ALGO · APY {query.error ? 'Unavailable' : query.data !== undefined ? `${(query.data * 100).toFixed(2)}%` : 'Loading'}</div>;
}
