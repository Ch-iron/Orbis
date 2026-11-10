'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
import { readLinearPosition } from './client';
import { prepareLinearAction, type LinearAction } from './actions';
import { getNearSelector, useNearWallet } from '@/features/near-staking/wallet';
export function useLinearStaking() {
  const address = useNearWallet((state) => state.address);
  const walletType = useWalletTypeStore((state) => state.walletType);
  const owner = walletType === 'near' ? address : null;
  const cache = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void getNearSelector().catch((cause) => setError(cause instanceof Error ? cause.message : 'NEAR wallet initialization failed')); }, []);
  const position = useQuery({ queryKey: ['near', 'linear', owner], queryFn: () => readLinearPosition(owner!), enabled: !!owner });
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [hash, setHash] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  async function execute(action: LinearAction) {
    if (lock.current) return;
    lock.current = true; setPending(true); setError(null); setHash(null); setConfirmed(false);
    try {
      const selector = await getNearSelector();
      const check = () => { if (!owner || useNearWallet.getState().address !== owner || selector.options.network.networkId !== 'mainnet' || !selector.isSignedIn()) throw new Error('Check the connected NEAR mainnet account.'); };
      check();
      const transaction = await prepareLinearAction(owner!, action);
      check();
      const wallet = await selector.wallet();
      const result = await wallet.signAndSendTransaction(transaction);
      if (!result) throw new Error('The wallet did not return transaction results. Check the wallet history.');
      setHash(result.transaction.hash);
      if (typeof result.status === 'string' || !('SuccessValue' in result.status)) throw new Error('NEAR transaction execution failed. Check the transaction history.');
      if (result.receipts_outcome.some((receipt) => typeof receipt.outcome.status !== 'string' && 'Failure' in receipt.outcome.status)) throw new Error('A NEAR child contract call failed. Check the transaction history.');
      setConfirmed(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'NEAR transaction failed.'); }
    finally { void cache.invalidateQueries({ queryKey: ['near'] }); lock.current = false; setPending(false); }
  }
  return { owner, position, execute, pending, error, hash, confirmed };
}
