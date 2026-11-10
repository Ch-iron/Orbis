'use client';
import { useState } from 'react';
import { PoolStakingTabs } from '@/features/staking/PoolStakingTabs';
import { StakingTargetTable } from '@/features/staking/StakingTargetTable';
import { formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { WalletSelectDialog } from '@/components/layout/WalletSelectDialog';
import { useAvalancheStaking } from './useAvalancheStaking';
export function AvalancheStakingView() {
  const staking = useAvalancheStaking();
  const [open, setOpen] = useState(false);
  const [nodeID, setNode] = useState('');
  const [amount, setAmount] = useState('');
  const [endTime, setEnd] = useState('');
  const errors = [staking.validators.error, staking.balance.error, staking.positions.error, staking.receipt.error].filter(Boolean);
  const transactionFeedback = (<>{staking.pending && <p role="status">Waiting for transaction creation and wallet approval.</p>}{staking.error && <p role="alert" className="text-destructive">{staking.error}</p>}{staking.hash && <a className="underline break-all" href={`https://subnets.avax.network/p-chain/tx/${staking.hash}`} target="_blank" rel="noreferrer">{staking.receipt.data === 'success' ? 'Confirmed transaction' : 'Submitted, awaiting on-chain confirmation'}</a>}</>);
  return <div className="space-y-6"><h1 className="text-2xl font-bold">Staking</h1><WalletSelectDialog open={open} onOpenChange={setOpen} />{!staking.owner && <Button onClick={() => setOpen(true)}>Connect P-Chain Wallet</Button>}
    <p className="text-sm text-muted-foreground">Delegate at least 25 AVAX for 14–365 days. Early unstaking is not available. At maturity, principal and eligible rewards return to the P-Chain. Move AVAX from the C-Chain to the P-Chain using Core before staking.</p>
    <p className="break-all">{staking.owner}</p><p>Available balance: {staking.balance.data ? `${formatUnits(staking.balance.data.unlocked, 9)} AVAX` : 'Not loaded'}</p>{errors.map((error, index) => <p key={index} role="alert" className="text-destructive">{error?.message}</p>)}
    <PoolStakingTabs connected={!!staking.owner} pending={staking.pending}
      selection={<><StakingTargetTable targets={(staking.validators.data ?? []).map((item) => ({ id: item.nodeID, name: item.nodeID, details: <>Commission {item.delegationFee}% · Period ends {new Date(Number(item.endTime) * 1000).toLocaleDateString()}</> }))} value={nodeID} onSelect={setNode} loading={staking.validators.isPending} error={staking.validators.error} pending={staking.pending}><p className="text-xs text-muted-foreground">Validator commission is deducted from rewards. Unverified yield estimates are not shown.</p><label className="block">Amount (AVAX)<input className="block w-full rounded border bg-background p-2" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><label className="block">Delegation end (local time)<input className="block w-full rounded border bg-background p-2" type="datetime-local" value={endTime} onChange={(event) => setEnd(event.target.value)} /></label><Button disabled={!staking.owner || staking.pending || !nodeID || !amount || !endTime} onClick={() => staking.execute({ nodeID, amount, endTime: Math.floor(new Date(endTime).getTime() / 1000) })}>Review Duration and Amount, Then Delegate in Wallet</Button>
      {transactionFeedback}
      </StakingTargetTable></>}
      positions={<>{staking.owner && <section className="space-y-3 rounded-xl border p-4"><h2 className="font-semibold">My Stakes</h2>{staking.positions.isPending && <p>Loading</p>}{staking.positions.data?.length === 0 && <p>No active staking positions.</p>}{staking.positions.data?.map((position) => <div key={position.txHash} className="border-b pb-3"><p className="break-all">{position.nodeId}</p><p>{formatUnits(BigInt(position.autoRenew?.compoundedWeight ?? position.amountStaked.find((token) => token.symbol === 'AVAX')?.amount ?? '0'), 9)} AVAX · {position.autoRenew ? 'Auto-renewing validator stake' : 'Fixed-term stake'}</p><p>Period ends: {new Date(position.endTimestamp * 1000).toLocaleString()}</p><p>Conditional estimated rewards: {formatUnits(BigInt(position.estimatedReward), 9)} AVAX</p></div>)}</section>}</>}
    />
    {transactionFeedback}
  </div>;
}
