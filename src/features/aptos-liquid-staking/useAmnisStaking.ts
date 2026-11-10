'use client';
import { useRef, useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
import { aptosClient, aptosAddress } from '@/lib/chains/aptos/client';
import { prepareAmnisAction, type AmnisAction } from './actions';

import { readAmnisPosition } from './client';

export function useAmnisStaking() {
  const wallet = useWallet();
  const walletType = useWalletTypeStore((state) => state.walletType);
  const owner = walletType === 'aptos' && wallet.connected && wallet.account ? aptosAddress(wallet.account.address.toString()) : undefined;
  const current = useRef(wallet); current.current = wallet;
  const cache = useQueryClient();
  const position = useQuery({ queryKey: ['aptos', 'amnis', owner], queryFn: () => readAmnisPosition(owner!), enabled: !!owner });
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  async function execute(action: AmnisAction) {
    if (lock.current) return;
    lock.current = true; setPending(true); setError(null); setHash(null); setConfirmed(false);
    try {
      const check = () => {
        const active = current.current;
        if (!owner || !active.connected || !active.account || aptosAddress(active.account.address.toString()) !== owner || Number(active.network?.chainId) !== 1) throw new Error('Check the connected Aptos mainnet account.');
      };
      check();
      const data = await prepareAmnisAction(owner!, action);
      check();
      const submitted = await current.current.signAndSubmitTransaction(data);
      setHash(submitted.hash);
      const receipt = await aptosClient.waitForTransaction({ transactionHash: submitted.hash, options: { checkSuccess: true } });
      if (!receipt.success) throw new Error(receipt.vm_status);
      setConfirmed(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Aptos transaction failed.'); }
    finally { void cache.invalidateQueries({ queryKey: ['aptos'] }); lock.current = false; setPending(false); }
  }
  return { owner, position, execute, pending, error, hash, confirmed };
}
