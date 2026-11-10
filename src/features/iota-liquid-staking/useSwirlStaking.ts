'use client';

import { useRef, useState } from 'react';
import { useCurrentAccount, useSignTransaction } from '@iota/dapp-kit';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
import { iotaClient } from '@/lib/chains/iota/client';
import { prepareSwirlAction } from './actions';
import type { SwirlAction } from './actions';

import { readSwirlPosition } from './client';

export function useSwirlStaking() {
  const account = useCurrentAccount();
  const walletType = useWalletTypeStore((state) => state.walletType);
  const owner = walletType === 'iota' && account?.chains.includes('iota:mainnet') ? account.address : undefined;
  const current = useRef(account); current.current = account;
  const sign = useSignTransaction();
  const cache = useQueryClient();
  const position = useQuery({ queryKey: ['iota', 'swirl', owner], queryFn: () => readSwirlPosition(owner!), enabled: !!owner });
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [digest, setDigest] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const execute = async (action: SwirlAction) => {
    if (lock.current) return;
    lock.current = true; setPending(true); setError(null); setDigest(null); setConfirmed(false);
    try {
      const checkAccount = () => {
        if (!owner || current.current?.address !== owner || !current.current.chains.includes('iota:mainnet')) throw new Error('Check the connected IOTA mainnet account.');
      };
      checkAccount();
      const transaction = await prepareSwirlAction(owner!, action);
      checkAccount();
      const signed = await sign.mutateAsync({ transaction, chain: 'iota:mainnet' });
      checkAccount();
      const submitted = await iotaClient.executeTransactionBlock({ transactionBlock: signed.bytes, signature: signed.signature, options: { showEffects: true } });
      setDigest(submitted.digest);
      const receipt = await iotaClient.waitForTransaction({ digest: submitted.digest, options: { showEffects: true } });
      if (receipt.effects?.status.status !== 'success') throw new Error(receipt.effects?.status.error ?? 'Could not confirm IOTA transaction execution.');
      setConfirmed(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'IOTA transaction failed.'); }
    finally { void cache.invalidateQueries({ predicate: (query) => query.queryKey.includes('iota') }); lock.current = false; setPending(false); }
  };
  return { owner, position, execute, pending, error, digest, confirmed };
}
