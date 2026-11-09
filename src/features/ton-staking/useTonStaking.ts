'use client';
import { useEffect, useRef, useState } from 'react';
import { useTonWallet, useTonConnectUI } from '@tonconnect/ui-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
import { readTonBalance, readTonPool, readTonPools, readTonPositions, tonAddress } from '@/lib/chains/ton/client';
import { prepareTonAction, type TonAction } from './actions';
import { readTonReceipt, tonMessageHash } from './receipt';
export function useTonStaking(pool: string) {
  const wallet = useTonWallet();
  const [ui] = useTonConnectUI();
  const walletType = useWalletTypeStore((state) => state.walletType);
  const owner = walletType === 'ton' && wallet?.account.chain === '-239' ? wallet.account.address : undefined;
  const current = useRef(wallet); current.current = wallet;
  const cache = useQueryClient();
  const pools = useQuery({ queryKey: ['ton', 'pools'], queryFn: readTonPools });
  const poolInfo = useQuery({ queryKey: ['ton', pool, 'config'], queryFn: () => readTonPool(pool), enabled: !!pool });
  const positions = useQuery({ queryKey: ['ton', owner, 'positions'], queryFn: () => readTonPositions(owner!), enabled: !!owner });
  const balance = useQuery({ queryKey: ['ton', owner, 'balance'], queryFn: () => readTonBalance(owner!), enabled: !!owner });
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ hash: string; pool: string } | null>(null);
  const receipt = useQuery({ queryKey: ['ton-receipt', submitted?.hash], queryFn: () => readTonReceipt(submitted!.hash, submitted!.pool), enabled: !!submitted, refetchInterval: (query) => query.state.data === 'success' || query.state.data === 'failed' ? false : 5000 });
  useEffect(() => { if (receipt.data === 'success' || receipt.data === 'failed') void cache.invalidateQueries({ queryKey: ['ton'] }); }, [receipt.data, cache]);
  async function execute(action: TonAction) {
    if (lock.current) return;
    lock.current = true; setPending(true); setError(null); setSubmitted(null);
    try {
      const check = () => { if (!owner || !current.current || current.current.account.chain !== '-239' || tonAddress(current.current.account.address) !== tonAddress(owner)) throw new Error('연결된 TON 메인넷 계정을 확인하세요.'); };
      check();
      const transaction = await prepareTonAction(owner!, action);
      check();
      const sent = await ui.sendTransaction(transaction);
      setSubmitted({ hash: tonMessageHash(sent.boc), pool: action.pool });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'TON 거래에 실패했습니다.'); }
    finally { lock.current = false; setPending(false); }
  }
  return { owner, pools, poolInfo, positions, balance, execute, pending, error, submitted, receipt };
}
