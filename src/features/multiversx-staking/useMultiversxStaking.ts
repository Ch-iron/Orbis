'use client';
import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
import { multiversxClient, readMultiversxBalance, readMultiversxPositions, readMultiversxProviders } from '@/lib/chains/multiversx/client';
import { prepareMultiversxAction, type MultiversxAction } from './actions';
import { signMultiversxTransaction, useMultiversxWallet } from './wallet';
export function useMultiversxStaking() {
  const address = useMultiversxWallet((state) => state.address);
  const walletType = useWalletTypeStore((state) => state.walletType);
  const owner = walletType === 'multiversx' ? address : null;
  const cache = useQueryClient();
  const validators = useQuery({ queryKey: ['multiversx', 'validators'], queryFn: readMultiversxProviders });
  const positions = useQuery({ queryKey: ['multiversx', owner, 'positions'], queryFn: () => readMultiversxPositions(owner!), enabled: !!owner });
  const balance = useQuery({ queryKey: ['multiversx', owner, 'balance'], queryFn: () => readMultiversxBalance(owner!), enabled: !!owner });
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  async function execute(action: MultiversxAction) {
    if (lock.current) return;
    lock.current = true; setPending(true); setError(null); setHash(null); setConfirmed(false);
    try {
      if (!owner) throw new Error('MultiversX 지갑을 연결하세요.');
      const transaction = await prepareMultiversxAction(owner, action);
      const signed = await signMultiversxTransaction(owner, transaction);
      const submitted = await multiversxClient.sendTransaction(signed);
      setHash(submitted);
      const receipt = await multiversxClient.awaitTransactionCompleted(submitted);
      if (!receipt.status.isSuccessful()) throw new Error('MultiversX 거래 실행에 실패했습니다. 거래 기록을 확인하세요.');
      setConfirmed(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'MultiversX 거래에 실패했습니다.'); }
    finally { void cache.invalidateQueries({ queryKey: ['multiversx'] }); lock.current = false; setPending(false); }
  }
  return { owner, validators, positions, balance, execute, pending, error, hash, confirmed };
}
