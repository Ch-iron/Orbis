'use client';
import { useState } from 'react';
import { PoolStakingTabs } from '@/features/staking/PoolStakingTabs';
import { StakingTargetTable } from '@/features/staking/StakingTargetTable';
import { formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { WalletSelectDialog } from '@/components/layout/WalletSelectDialog';
import { useCardanoStaking } from './useCardanoStaking';
const ada = (value: string | bigint) => formatUnits(BigInt(value), 6);
export function CardanoStakingView() {
  const [pool, setPool] = useState('');
  const [open, setOpen] = useState(false);
  const [allowAbstain, setAllowAbstain] = useState(false);
  const staking = useCardanoStaking(pool);
  const ready = staking.connected && !staking.pending;
  const errors = [staking.pools.error, staking.account.error, staking.balance.error, staking.parameters.error, staking.history.error, staking.receipt.error].filter(Boolean);
  const account = staking.account.data;
  const choices = staking.pools.data?.filter((item) => item.pool_status === 'registered' && item.retiring_epoch === null);
  return <div className="space-y-6"><h1 className="text-2xl font-bold">Cardano Staking</h1>
    <WalletSelectDialog open={open} onOpenChange={setOpen} />{!staking.connected && <Button onClick={() => setOpen(true)}>Connect Cardano Wallet</Button>}
    <p className="text-sm text-muted-foreground">ADA stays in your wallet and remains spendable. The entire selected stake account is delegated to one pool without transferring a separate stake amount. Delegation changes and rewards take effect after an epoch delay.</p>
    <p>Wallet balance: {staking.balance.data !== undefined ? `${ada(staking.balance.data)} ADA` : 'Not loaded'}</p><p>Initial registration deposit: {staking.parameters.data ? `${ada(BigInt(staking.parameters.data.keyDeposit))} ADA` : 'Loading'}  + transaction fee</p>
    {errors.map((error, index) => <p key={index} role="alert" className="text-destructive">{error?.message}</p>)}
    <PoolStakingTabs connected={!!staking.connected} pending={staking.pending}
      selection={<><section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">Select a Delegation Pool</h2>{staking.pools.isPending && <p>Loading pools</p>}<StakingTargetTable targets={(choices ?? []).map((item) => ({ id: item.pool_id_bech32, name: item.ticker ?? item.pool_id_bech32, details: <>Commission {(item.margin * 100).toFixed(2)}% · Fixed cost {ada(item.fixed_cost)} ADA/epoch</> }))} value={pool} onSelect={setPool} loading={staking.pools.isPending} error={staking.pools.error} pending={staking.pending} />
      {staking.history.data?.[0] && <p>Latest epoch with finalized rewards: {staking.history.data[0].epoch_no}  · APY: {staking.history.data[0].epoch_ros.toFixed(2)}%</p>}<p className="text-xs text-muted-foreground">The annual percentage yield (APY) is calculated by Koios from annualized rewards for that epoch. It does not guarantee future returns. Fixed costs are deducted from the total pool rewards.</p><Button disabled={!ready || !pool} onClick={() => staking.execute({ kind: 'delegate', pool })}>Delegate Entire Account to This Pool</Button>
    </section></>}
      positions={<>{staking.connected && <section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">My Stake Account</h2><p className="break-all">{staking.connection?.stakeAddress}</p>{staking.account.isPending && <p>Loading</p>}{account === null && <p>This account is not registered yet.</p>}{account && <><p className="break-all">Current pool: {account.delegated_pool ?? 'Not delegated'}</p><p>Account balance (including rewards): {ada(account.total_balance)}  ADA · Claimable rewards: {ada(account.rewards_available)} ADA</p><p className="text-xs text-muted-foreground">The account balance overlaps with the wallet balance above. These amounts are not added together.</p>{!account.delegated_drep && BigInt(account.rewards_available) > BigInt(0) && <label className="flex gap-2"><input type="checkbox" checked={allowAbstain} onChange={(event) => setAllowAbstain(event.target.checked)} />I agree to register governance voting as Always Abstain to claim rewards. You can choose another representative in your wallet.</label>}<div className="flex gap-2"><Button disabled={!ready || BigInt(account.rewards_available) === BigInt(0)} onClick={() => staking.execute({ kind: 'claim', allowAbstain })}>Claim Rewards</Button><Button variant="outline" disabled={!ready || account.status !== 'registered'} onClick={() => staking.execute({ kind: 'deregister', allowAbstain })}>Claim Rewards, End Delegation and Return Deposit</Button></div></>}</section>}</>}
    />
    {staking.pending && <p role="status">Waiting for transaction creation and wallet approval.</p>}{staking.error && <p role="alert" className="text-destructive">{staking.error}</p>}{staking.hash && <a className="block break-all underline" href={`https://cardanoscan.io/transaction/${staking.hash}`} target="_blank" rel="noreferrer">{staking.receipt.data === 'success' ? 'Confirmed transaction' : staking.receipt.data === 'failed' ? 'Failed transaction' : 'Submitted, awaiting on-chain confirmation'}: {staking.hash}</a>}
  </div>;
}
