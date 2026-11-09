'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
import { readAvalancheBalance, readAvalanchePositions, readAvalancheValidators, readAvalancheReceipt } from '@/lib/chains/avalanche/client';
import { useAvalancheWallet } from './wallet';
import { prepareAvalancheAction, type AvalancheAction } from './actions';
export function useAvalancheStaking() {
  const connection = useAvalancheWallet((state) => state.connection);
  const type = useWalletTypeStore((state) => state.walletType);
  const owner = type === 'avalanche' ? connection?.address : undefined;
  const cache = useQueryClient();
  const validators = useQuery({ queryKey: ['avalanche', 'validators'], queryFn: readAvalancheValidators, staleTime: 60_000 });
  const balance = useQuery({ queryKey: ['avalanche', owner, 'balance'], queryFn: () => readAvalancheBalance(owner!), enabled: !!owner });
  const positions = useQuery({ queryKey: ['avalanche', owner, 'positions'], queryFn: () => readAvalanchePositions(owner!), enabled: !!owner });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const lock = useRef(false);
  const receipt = useQuery({ queryKey: ['avalanche-receipt', hash], queryFn: () => readAvalancheReceipt(hash!), enabled: !!hash, retry: false, refetchInterval: (query) => query.state.data === 'success' || query.state.error ? false : 5000 });
  useEffect(() => { if (receipt.data === 'success') void cache.invalidateQueries({ queryKey: ['avalanche'] }); }, [receipt.data, cache]);
  async function execute(action: AvalancheAction) {
    if (lock.current) return;
    lock.current = true; setPending(true); setError(null); setHash(null);
    try {
      if (!owner || !connection) throw new Error('P-Chain 지갑을 연결하세요.');
      const { transaction } = await prepareAvalancheAction(owner, action);
      if (useAvalancheWallet.getState().connection !== connection || useWalletTypeStore.getState().walletType !== 'avalanche') throw new Error('지갑 연결이 변경되었습니다.');
      setHash(await connection.send(transaction));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Avalanche 거래에 실패했습니다.'); }
    finally { lock.current = false; setPending(false); }
  }
  return { owner, validators, balance, positions, pending, error, hash, receipt, execute };
}
