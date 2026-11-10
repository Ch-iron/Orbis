'use client';

import { useRef, useState } from 'react';
import { useCurrentAccount, useDAppKit } from '@mysten/dapp-kit-react';
import { fromBase64, toBase64 } from '@mysten/sui/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { OrbisSuiKit } from '@/lib/wallet/suiProvider';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
import { suiClient } from '@/lib/chains/sui/client';
import { prepareHaedalAction } from './actions';
import { readHaedalPosition } from './client';
import type { HaedalAction } from './actions';
import { useSuiWalletConnect, signSuiWalletConnect } from '@/features/sui-staking/walletconnect';

export function useHaedalStaking() {
  const account = useCurrentAccount();
  const kit = useDAppKit<OrbisSuiKit>();
  const connection = useSuiWalletConnect((state) => state.connection);
  const walletType = useWalletTypeStore((state) => state.walletType);
  const owner = walletType === 'sui' ? connection?.address ?? (account?.chains.includes('sui:mainnet') ? account.address : undefined) : undefined;
  const current = useRef(owner); current.current = owner;
  const cache = useQueryClient();
  const position = useQuery({ queryKey: ['sui', 'haedal', owner], queryFn: () => readHaedalPosition(owner!), enabled: !!owner });
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [digest, setDigest] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const execute = async (action: HaedalAction) => {
    if (lock.current) return;
    lock.current = true; setPending(true); setError(null); setDigest(null); setConfirmed(false);
    try {
      const checkAccount = () => {
        if (!owner || current.current !== owner) throw new Error('The Sui wallet account has changed.');
        if (connection) {
          if (useSuiWalletConnect.getState().connection?.address !== owner) throw new Error('The WalletConnect connection has changed.');
        } else if (kit.stores.$currentNetwork.get() !== 'mainnet' || kit.stores.$connection.get().account?.address !== owner) throw new Error('Check the Sui mainnet account.');
      };
      checkAccount();
      const prepared = await prepareHaedalAction(owner!, action);
      checkAccount();
      const signed = connection ? await signSuiWalletConnect(owner!, toBase64(prepared.bytes)) : await kit.signTransaction({ transaction: prepared.transaction });
      checkAccount();
      const result = await suiClient.core.executeTransaction({ transaction: fromBase64(signed.bytes), signatures: [signed.signature] });
      setDigest(result.$kind === 'Transaction' ? result.Transaction.digest : result.FailedTransaction.digest);
      if (result.$kind === 'FailedTransaction') throw new Error('Sui transaction execution failed.');
      const receipt = await suiClient.core.waitForTransaction({ result });
      if (receipt.$kind === 'FailedTransaction') throw new Error('Sui transaction execution failed.');
      setConfirmed(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Sui transaction failed.'); }
    finally { void cache.invalidateQueries({ predicate: (query) => query.queryKey.includes('sui') }); lock.current = false; setPending(false); }
  };
  return { owner, position, execute, pending, error, digest, confirmed };
}
