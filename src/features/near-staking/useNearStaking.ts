'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
import { readNearBalance, readNearPositions, readNearValidators, readNearApr, readNearPool } from '@/lib/chains/near/client';
import { prepareNearAction, type NearAction } from './actions';
import { getNearSelector, useNearWallet } from './wallet';
export function useNearStaking(pool: string) {
  const address = useNearWallet((state) => state.address);
  const walletType = useWalletTypeStore((state) => state.walletType);
  const owner = walletType === 'near' ? address : null;
  const cache = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void getNearSelector().catch((cause) => setError(cause instanceof Error ? cause.message : 'NEAR 지갑 초기화 실패')); }, []);
  const validators = useQuery({ queryKey: ['near', 'validators'], queryFn: readNearValidators });
  const poolInfo = useQuery({ queryKey: ['near', pool, 'pool'], queryFn: () => readNearPool(pool), enabled: !!pool });
  const apr = useQuery({ queryKey: ['near', 'apr'], queryFn: readNearApr });
  const positions = useQuery({ queryKey: ['near', owner, 'positions'], queryFn: () => readNearPositions(owner!), enabled: !!owner });
  const balance = useQuery({ queryKey: ['near', owner, 'balance'], queryFn: () => readNearBalance(owner!), enabled: !!owner });
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [hash, setHash] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  async function execute(action: NearAction) {
    if (lock.current) return;
    lock.current = true; setPending(true); setError(null); setHash(null); setConfirmed(false);
    try {
      const selector = await getNearSelector();
      const check = () => { if (!owner || useNearWallet.getState().address !== owner || selector.options.network.networkId !== 'mainnet' || !selector.isSignedIn()) throw new Error('연결된 NEAR 메인넷 계정을 확인하세요.'); };
      check();
      const transaction = await prepareNearAction(owner!, action);
      check();
      const wallet = await selector.wallet();
      const result = await wallet.signAndSendTransaction(transaction);
      if (!result) throw new Error('지갑에서 거래 결과를 반환하지 않았습니다. 지갑 기록을 확인하세요.');
      setHash(result.transaction.hash);
      if (typeof result.status === 'string' || !('SuccessValue' in result.status)) throw new Error('NEAR 거래 실행에 실패했습니다. 거래 기록을 확인하세요.');
      if (result.receipts_outcome.some((receipt) => typeof receipt.outcome.status !== 'string' && 'Failure' in receipt.outcome.status)) throw new Error('NEAR 하위 계약 호출에 실패했습니다. 거래 기록을 확인하세요.');
      setConfirmed(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'NEAR 거래에 실패했습니다.'); }
    finally { void cache.invalidateQueries({ queryKey: ['near'] }); lock.current = false; setPending(false); }
  }
  return { owner, validators, poolInfo, apr, positions, balance, execute, pending, error, hash, confirmed };
}
