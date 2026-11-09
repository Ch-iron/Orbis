'use client';

import { useState } from 'react';
import { formatEther } from 'viem';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WalletSelectDialog } from '@/components/layout/WalletSelectDialog';
import { useEthereumStaking } from './useEthereumStaking';

export function EthereumStakingView() {
  const staking = useEthereumStaking();
  const [provider, setProvider] = useState<'lido' | 'rocket'>('lido');
  const [operation, setOperation] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [walletOpen, setWalletOpen] = useState(false);
  const balances = staking.positions.data;
  const error = staking.error ?? staking.positions.error?.message ?? staking.withdrawals.error?.message;
  const providerError = provider === 'lido' ? staking.lido.error : staking.rocket.error;
  const unit = operation === 'deposit' ? 'ETH' : provider === 'lido' ? 'stETH' : 'rETH';
  const ready = staking.connected && staking.correctNetwork && !!balances && !staking.pending && (provider === 'lido' ? !!staking.lido.data : !!staking.rocket.data);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Ethereum Staking</h1>
      <p className="text-muted-foreground">Choose Lido or Rocket Pool. Rewards accumulate in your stETH balance or the ETH value of rETH. There is no separate reward claim.</p>
      {!staking.connected || !staking.correctNetwork ? (
        <Button className="self-start" onClick={() => setWalletOpen(true)}>Connect to Ethereum Mainnet</Button>
      ) : null}
      <WalletSelectDialog open={walletOpen} onOpenChange={setWalletOpen} />
      <div className="grid gap-4 md:grid-cols-3">
        <Balance title="Available ETH" value={balances?.eth} unit="ETH" />
        <Balance title="Lido" value={balances?.steth} unit="stETH" />
        <Balance title="Rocket Pool" value={balances?.reth} unit="rETH">
          {balances && <p className="text-sm text-muted-foreground">≈ {formatEther(balances.rethEth)} ETH</p>}
        </Balance>
      </div>
      <Card>
        <CardHeader><CardTitle>Manage stake</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Button disabled={staking.pending} variant={provider === 'lido' ? 'default' : 'outline'} onClick={() => { setProvider('lido'); setAmount(''); }}>Lido · stETH</Button>
            <Button disabled={staking.pending} variant={provider === 'rocket' ? 'default' : 'outline'} onClick={() => { setProvider('rocket'); setAmount(''); }}>Rocket Pool · rETH</Button>
          </div>
          <div className="flex gap-2">
            <Button disabled={staking.pending} variant={operation === 'deposit' ? 'default' : 'outline'} onClick={() => { setOperation('deposit'); setAmount(''); }}>Stake</Button>
            <Button disabled={staking.pending} variant={operation === 'withdraw' ? 'default' : 'outline'} onClick={() => { setOperation('withdraw'); setAmount(''); }}>Withdraw</Button>
          </div>
          {provider === 'lido' && staking.lido.data && <p className="text-sm text-muted-foreground">
            Deposit capacity: {formatEther(staking.lido.data.depositLimit)} ETH. Withdrawal per request: {formatEther(staking.lido.data.minWithdrawal)}–{formatEther(staking.lido.data.maxWithdrawal)} stETH.
          </p>}
          {provider === 'rocket' && staking.rocket.data && <p className="text-sm text-muted-foreground">
            Deposits {staking.rocket.data.enabled ? 'enabled' : 'paused'}. Minimum: {formatEther(staking.rocket.data.minimum)} ETH. Capacity: {formatEther(staking.rocket.data.maximum)} ETH. Deposit fee: {Number(staking.rocket.data.fee) / 1e16}%. 1 rETH ≈ {formatEther(staking.rocket.data.exchangeRate)} ETH.
          </p>}
          <label className="flex flex-col gap-2 text-sm">
            Amount ({unit})
            <Input inputMode="decimal" value={amount} disabled={staking.pending} onChange={(event) => setAmount(event.target.value)} placeholder="0.0" />
          </label>
          {operation === 'deposit' && <p className="text-sm text-muted-foreground">Keep ETH available for transaction fees. The wallet will show the fee before you sign.</p>}
          {operation === 'withdraw' && <p className="text-sm text-muted-foreground">
            {provider === 'lido' ? 'Approve the requested stETH amount, then submit the withdrawal request. Claim ETH below after finalization. Final ETH payout can be lower than the requested stETH amount.' : 'Burn rETH to receive ETH at the protocol rate. Available liquidity and any protocol transfer lock are checked before signing.'}
          </p>}
          <Button className="self-start" disabled={!ready || !amount} onClick={() => void staking.execute({ type: `${provider}-${operation}`, amount })}>
            {staking.pending ? 'Waiting for wallet / confirmation…' : operation === 'deposit' ? 'Stake ETH' : provider === 'lido' ? 'Request withdrawal' : 'Withdraw ETH'}
          </Button>
          {providerError && <p role="alert" className="break-words text-sm text-destructive">Cannot load current limits: {providerError.message}</p>}
          {error && <p role="alert" className="break-words text-sm text-destructive">{error}</p>}
          {staking.hashes.map((hash) => <a key={hash} className="break-all text-sm underline" href={`https://etherscan.io/tx/${hash}`} target="_blank" rel="noreferrer">{staking.confirmedHashes.includes(hash) ? 'Confirmed' : 'Submitted (check status)'}: {hash}</a>)}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Lido withdrawal requests</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          {staking.withdrawals.isLoading && <p>Loading requests…</p>}
          {staking.withdrawals.data?.length === 0 && <p className="text-muted-foreground">No pending withdrawal requests.</p>}
          {staking.withdrawals.data?.map((request) => <div key={request.id.toString()} className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
            <div><p>#{request.id.toString()} · {formatEther(request.amountOfStETH)} stETH requested</p><p className="text-sm text-muted-foreground">{request.isFinalized ? 'Ready to claim ETH' : 'Awaiting finalization. No fixed completion date.'}</p></div>
            <Button disabled={!request.isFinalized || staking.pending || !staking.correctNetwork} onClick={() => void staking.execute({ type: 'lido-claim', requestId: request.id })}>Claim ETH</Button>
          </div>)}
        </CardContent>
      </Card>
    </div>
  );
}

function Balance({ title, value, unit, children }: { title: string; value: bigint | undefined; unit: string; children?: React.ReactNode }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="break-words"><p>{value === undefined ? '-' : formatEther(value)} {unit}</p>{children}</CardContent></Card>;
}
