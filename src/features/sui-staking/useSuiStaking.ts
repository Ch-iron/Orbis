'use client';

import { useRef, useState } from 'react';
import { useCurrentAccount, useDAppKit } from '@mysten/dapp-kit-react';
import { fromBase64, toBase64 } from '@mysten/sui/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { OrbisSuiKit } from '@/lib/wallet/suiProvider';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
import { suiClient, readSuiPositions, readSuiValidators, readSuiValidatorYield } from '@/lib/chains/sui/client';
import { prepareSuiAction } from './actions';
import type { SuiAction } from './actions';
import { useSuiWalletConnect, signSuiWalletConnect } from './walletconnect';

export function useSuiStaking() {
  const account = useCurrentAccount();
  const kit = useDAppKit<OrbisSuiKit>();
  const connection = useSuiWalletConnect((state) => state.connection);
  const walletType = useWalletTypeStore((state) => state.walletType);
  const owner = walletType === 'sui' ? connection?.address ?? account?.address : undefined;
  const current = useRef(owner); current.current = owner;
  const cache = useQueryClient();
  const validators = useQuery({ queryKey: ['sui', 'validators'], queryFn: readSuiValidators });
  const positions = useQuery({ queryKey: ['sui', owner, 'positions'], queryFn: () => readSuiPositions(owner!), enabled: !!owner });
  const balance = useQuery({ queryKey: ['sui', owner, 'balance'], queryFn: () => suiClient.core.getBalance({ owner: owner! }), enabled: !!owner });
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [digest, setDigest] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const execute = async (action: SuiAction) => {
    if (lock.current) return;
    lock.current = true; setPending(true); setError(null); setDigest(null); setConfirmed(false);
    try {
      const checkAccount = () => {
        if (!owner || current.current !== owner) throw new Error('Sui 지갑 계정이 변경되었습니다.');
        if (connection) {
          if (useSuiWalletConnect.getState().connection?.address !== owner) throw new Error('WalletConnect 연결이 변경되었습니다.');
        } else if (kit.stores.$currentNetwork.get() !== 'mainnet' || kit.stores.$connection.get().account?.address !== owner) throw new Error('Sui 메인넷 계정을 확인하세요.');
      };
      checkAccount();
      const prepared = await prepareSuiAction(owner!, action);
      checkAccount();
      const signed = connection ? await signSuiWalletConnect(owner!, toBase64(prepared.bytes)) : await kit.signTransaction({ transaction: prepared.transaction });
      checkAccount();
      const result = await suiClient.core.executeTransaction({ transaction: fromBase64(signed.bytes), signatures: [signed.signature] });
      setDigest(result.$kind === 'Transaction' ? result.Transaction.digest : result.FailedTransaction.digest);
      if (result.$kind === 'FailedTransaction') throw new Error('Sui 거래 실행에 실패했습니다.');
      const receipt = await suiClient.core.waitForTransaction({ result });
      if (receipt.$kind === 'FailedTransaction') throw new Error('Sui 거래 실행에 실패했습니다.');
      setConfirmed(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Sui 거래에 실패했습니다.'); }
    finally { void cache.invalidateQueries({ predicate: (query) => query.queryKey.includes('sui') }); lock.current = false; setPending(false); }
  };
  return { owner, validators, positions, balance, execute, pending, error, digest, confirmed };
}

export function useSuiValidatorYield(tableId: string, activationEpoch: bigint) {
  return useQuery({ queryKey: ['sui', 'yield', tableId], queryFn: () => readSuiValidatorYield(tableId, activationEpoch), staleTime: 300_000, retry: false });
}
