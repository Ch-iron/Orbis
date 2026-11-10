'use client';
import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
import { multiversxClient } from '@/lib/chains/multiversx/client';
import { prepareXoxnoAction, type XoxnoAction } from './actions';
import { signMultiversxTransaction, useMultiversxWallet } from '@/features/multiversx-staking/wallet';
import { readXoxnoPosition } from './client';
export function useXoxnoStaking() {
  const address = useMultiversxWallet((state) => state.address);
  const walletType = useWalletTypeStore((state) => state.walletType);
  const owner = walletType === 'multiversx' ? address : null;
  const cache = useQueryClient();
  const position = useQuery({ queryKey: ['multiversx', 'xoxno', owner], queryFn: () => readXoxnoPosition(owner!), enabled: !!owner });
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  async function execute(action: XoxnoAction) {
    if (lock.current) return;
    lock.current = true; setPending(true); setError(null); setHash(null); setConfirmed(false);
    try {
      if (!owner) throw new Error('Connect a MultiversX wallet.');
      const transaction = await prepareXoxnoAction(owner, action);
      const signed = await signMultiversxTransaction(owner, transaction);
      const submitted = await multiversxClient.sendTransaction(signed);
      setHash(submitted);
      const receipt = await multiversxClient.awaitTransactionCompleted(submitted);
      if (!receipt.status.isSuccessful()) throw new Error('MultiversX transaction execution failed. Check the transaction history.');
      setConfirmed(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'MultiversX transaction failed.'); }
    finally { void cache.invalidateQueries({ queryKey: ['multiversx'] }); lock.current = false; setPending(false); }
  }
  return { owner, position, execute, pending, error, hash, confirmed };
}
