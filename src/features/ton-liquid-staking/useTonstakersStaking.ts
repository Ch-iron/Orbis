'use client';
import { useEffect, useRef, useState } from 'react';
import { useTonWallet, useTonConnectUI } from '@tonconnect/ui-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
import { tonAddress } from '@/lib/chains/ton/client';
import { prepareTonstakersAction, type TonstakersAction } from './actions';
import { readTonReceipt, tonMessageHash } from '@/features/ton-staking/receipt';
import { readTonstakersPosition, readTonstakersWithdrawals } from './client';
export function useTonstakersStaking() {
  const wallet = useTonWallet();
  const [ui] = useTonConnectUI();
  const walletType = useWalletTypeStore((state) => state.walletType);
  const owner = walletType === 'ton' && wallet?.account.chain === '-239' ? wallet.account.address : undefined;
  const current = useRef(wallet); current.current = wallet;
  const cache = useQueryClient();
  const position = useQuery({ queryKey: ['ton', 'tonstakers', owner], queryFn: () => readTonstakersPosition(owner!), enabled: !!owner, staleTime: 30_000 });
  const withdrawals = useQuery({ queryKey: ['ton', 'tonstakers-withdrawals', owner], queryFn: () => readTonstakersWithdrawals(owner!), enabled: !!owner, staleTime: 30_000 });
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ hash: string; pool: string } | null>(null);
  const receipt = useQuery({ queryKey: ['ton-receipt', submitted?.hash], queryFn: () => readTonReceipt(submitted!.hash, submitted!.pool), enabled: !!submitted, refetchInterval: (query) => query.state.data === 'success' || query.state.data === 'failed' ? false : 5000 });
  useEffect(() => { if (receipt.data === 'success' || receipt.data === 'failed') { void cache.invalidateQueries({ queryKey: ['ton'] }); lock.current = false; } }, [receipt.data, cache]);
  async function execute(action: TonstakersAction) {
    if (lock.current) return;
    lock.current = true; setPending(true); setError(null); setSubmitted(null);
    let broadcast = false;
    try {
      const check = () => { if (!owner || !current.current || current.current.account.chain !== '-239' || tonAddress(current.current.account.address) !== tonAddress(owner)) throw new Error('Check the connected TON mainnet account.'); };
      check();
      const transaction = await prepareTonstakersAction(owner!, action);
      check();
      const sent = await ui.sendTransaction(transaction);
      broadcast = true;
      setSubmitted({ hash: tonMessageHash(sent.boc), pool: transaction.messages[0].address });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'TON transaction failed.'); }
    finally { if (!broadcast) lock.current = false; setPending(false); }
  }
  return { owner, position, withdrawals, execute, pending: pending || (!!submitted && receipt.data !== 'success' && receipt.data !== 'failed'), error, submitted, receipt };
}
