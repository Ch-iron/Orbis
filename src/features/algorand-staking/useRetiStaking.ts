'use client';

import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWallet, useNetwork } from '@txnlab/use-wallet-react';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
import { readAlgorandAccount, readRetiPoolYield, readRetiPositions, readRetiRegistrationCost, readRetiValidators } from '@/lib/chains/algorand/client';
import { queryKeys } from '@/lib/queryKeys';
import { executeRetiAction } from './actions';
import type { RetiAction } from './actions';

export function useRetiStaking() {
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
  const validators = useQuery({ queryKey: ['reti', 'validators'], queryFn: readRetiValidators });
  const account = useQuery({ queryKey: ['reti', owner, 'account'], queryFn: () => readAlgorandAccount(owner!), enabled: !!owner });
  const positions = useQuery({ queryKey: ['reti', owner, 'positions'], queryFn: () => readRetiPositions(owner!), enabled: !!owner });
  const registration = useQuery({ queryKey: ['reti', owner, 'registration'], queryFn: () => readRetiRegistrationCost(owner!), enabled: !!owner });
  const execute = async (action: RetiAction) => {
    if (lock.current) return;
    lock.current = true;
    setPending(true); setError(null); setTxIds([]);
    try {
      if (!owner) throw new Error('Algorand 지갑을 연결하세요.');
      const assertWallet = () => {
        if (current.current.owner !== owner || current.current.activeNetwork !== 'mainnet') throw new Error('Algorand 메인넷과 연결된 지갑을 확인하세요.');
      };
      setTxIds(await executeRetiAction(action, owner, transactionSigner, assertWallet));
      await Promise.all([cache.invalidateQueries({ queryKey: ['reti'] }), cache.invalidateQueries({ queryKey: queryKeys.delegations('algorand', owner) }), cache.invalidateQueries({ queryKey: queryKeys.balance('algorand', owner) })]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Réti 거래에 실패했습니다.'); }
    finally { lock.current = false; setPending(false); }
  };
  return { owner, validators, account, positions, registration, pending, error, txIds, execute };
}

export function useRetiPoolYield(poolAppId: bigint) {
  return useQuery({ queryKey: ['reti', 'yield', poolAppId.toString()], queryFn: () => readRetiPoolYield(poolAppId), staleTime: 300_000, retry: false });
}
