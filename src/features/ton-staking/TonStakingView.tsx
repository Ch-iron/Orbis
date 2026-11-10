'use client';
import { useState } from 'react';
import { PoolStakingTabs } from '@/features/staking/PoolStakingTabs';
import { StakingTargetTable } from '@/features/staking/StakingTargetTable';
import { fromNano } from '@ton/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WalletSelectDialog } from '@/components/layout/WalletSelectDialog';
import { useTonStaking } from './useTonStaking';
export function TonStakingView() {
  const [pool, setPool] = useState('');
  const staking = useTonStaking(pool);
  const [amount, setAmount] = useState('');
  const [open, setOpen] = useState(false);
  const errors = [staking.pools.error, staking.poolInfo.error, staking.positions.error, staking.balance.error, staking.receipt.error].filter(Boolean);
  const ready = !!staking.owner && !staking.pending;
  return <div className="space-y-6"><h1 className="text-2xl font-bold">TON Validator Pool Staking</h1><p className="text-sm text-muted-foreground">Uses standard nominator-pools. A 1 TON processing fee is added to each stake. Only full withdrawals are supported. Withdrawal requests also require sending 1 TON; unused fees are returned. Rewards are included in the staked balance.</p>
    <WalletSelectDialog open={open} onOpenChange={setOpen} />{!staking.owner && <Button onClick={() => setOpen(true)}>Connect TON Wallet</Button>}<p>Balance: {staking.balance.data !== undefined ? `${fromNano(staking.balance.data)} TON` : 'Not loaded'}</p>
    {errors.map((error, index) => <p key={index} role="alert" className="text-destructive">{error?.message}</p>)}
    <PoolStakingTabs connected={!!staking.owner} pending={staking.pending}
      selection={<><section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">Select a Validator Pool</h2>{staking.pools.isPending && <p>Loading</p>}<StakingTargetTable targets={(staking.pools.data ?? []).filter((item) => item.cycle_end * 1000 > staking.pools.dataUpdatedAt).map((item) => ({ id: item.address, name: item.name, details: <>APY {Number.isFinite(item.apy) ? `${item.apy.toFixed(2)}%` : 'Unavailable'} · Participants {item.current_nominators}/{item.max_nominators}</> }))} value={pool} onSelect={setPool} loading={staking.pools.isPending} error={staking.pools.error} pending={staking.pending} />
      {staking.poolInfo.data && <p>Minimum stake {fromNano(staking.poolInfo.data.minStake)}  TON · Validator reward share {(staking.poolInfo.data.commission * 100).toFixed(2)}% · Participants {staking.poolInfo.data.count.toString()}/{staking.poolInfo.data.capacity.toString()}</p>}
      <p className="text-xs text-muted-foreground">The annual percentage yield (APY) is an estimate from TonAPI. Review the pool operator and terms before selecting a pool.</p><Input aria-label="TON stake amount" placeholder="TON amount to stake (excluding processing fee)" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /><Button disabled={!ready || !pool || !amount || !staking.poolInfo.data} onClick={() => staking.execute({ kind: 'stake', pool, amount })}>Send Stake Amount + 1 TON</Button>
    </section></>}
      positions={<>{staking.owner && <section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">My Standard Validator Pool Stakes</h2>{staking.positions.isPending && <p>Loading</p>}{staking.positions.data?.length === 0 && <p>No staking positions.</p>}{staking.positions.data?.map((position) => <div key={position.pool} className="border-b pb-3 space-y-2"><p className="break-all">{position.pool}</p><p>Active {fromNano(position.active)}  · Pending deposit {fromNano(position.pending)} TON</p><p>{position.withdrawing ? 'Withdrawal request pending' : 'Full withdrawal available'}</p><Button variant="outline" disabled={!ready || position.withdrawing || position.active + position.pending === BigInt(0)} onClick={() => staking.execute({ kind: 'withdraw', pool: position.pool })}>Send 1 TON to Request Full Withdrawal</Button></div>)}</section>}</>}
    />
    {staking.pending && <p role="status">Waiting for wallet approval.</p>}{staking.error && <p role="alert" className="text-destructive">{staking.error}</p>}{staking.submitted && <div><p role="status">{staking.receipt.data === 'success' ? 'Pool contract transaction processing confirmed.' : staking.receipt.data === 'failed' ? 'Transaction execution failed. Check the refund details.' : 'Message sent. Waiting for on-chain confirmation.'}</p><a className="block break-all underline" href={`https://tonviewer.com/transaction/${staking.submitted.hash}`} target="_blank" rel="noreferrer">View Message and Transaction</a></div>}
  </div>;
}
