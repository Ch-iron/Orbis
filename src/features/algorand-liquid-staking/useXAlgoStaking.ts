'use client';

import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWallet, useNetwork } from '@txnlab/use-wallet-react';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
import { readXAlgoPosition } from './client';
import { queryKeys } from '@/lib/queryKeys';
import { executeXAlgoAction } from './actions';
import type { XAlgoAction } from './actions';

export function useXAlgoStaking() {
  const { activeAddress, transactionSigner } = useWallet();
  const { activeNetwork } = useNetwork();
  const walletType = useWalletTypeStore((state) => state.walletType);
  const owner = walletType === 'algorand' ? activeAddress : null;
  const current = useRef({ owner, activeNetwork });
  current.current = { owner, activeNetwork };
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txIds, setTxIds] = useState<string[]>([]);
  const cache = useQueryClient();
  const [confirmed, setConfirmed] = useState(false);
  const position = useQuery({ queryKey: ['algorand', 'xalgo', owner], queryFn: () => readXAlgoPosition(owner!), enabled: !!owner });
  const execute = async (action: XAlgoAction) => {
    if (lock.current) return;
    lock.current = true;
    setPending(true); setError(null); setTxIds([]); setConfirmed(false);
    try {
      if (!owner) throw new Error('Connect an Algorand wallet.');
      const assertWallet = () => {
        if (current.current.owner !== owner || current.current.activeNetwork !== 'mainnet') throw new Error('Check the connected wallet and Algorand mainnet.');
      };
      await executeXAlgoAction(owner, action, transactionSigner, assertWallet, setTxIds);
      setConfirmed(true);
      await Promise.all([cache.invalidateQueries({ queryKey: ['algorand'] }), cache.invalidateQueries({ queryKey: queryKeys.delegations('algorand', owner) }), cache.invalidateQueries({ queryKey: queryKeys.balance('algorand', owner) })]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'xALGO transaction failed.'); }
    finally { lock.current = false; setPending(false); }
  };
  return { owner, position, pending, error, txIds, confirmed, execute };
}
