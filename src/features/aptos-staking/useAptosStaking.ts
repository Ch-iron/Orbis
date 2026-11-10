'use client';
import { useRef, useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
import { aptosClient, aptosAddress, readAptosBalance, readAptosPositions, readAptosValidators, readAptosApr } from '@/lib/chains/aptos/client';
import { prepareAptosAction, type AptosAction } from './actions';

export function useAptosStaking() {
  const wallet = useWallet();
  const walletType = useWalletTypeStore((state) => state.walletType);
  const owner = walletType === 'aptos' && wallet.connected && wallet.account ? aptosAddress(wallet.account.address.toString()) : undefined;
  const current = useRef(wallet); current.current = wallet;
  const cache = useQueryClient();
  const validators = useQuery({ queryKey: ['aptos', 'validators'], queryFn: readAptosValidators });
  const apr = useQuery({ queryKey: ['aptos', 'apr'], queryFn: readAptosApr });
  const positions = useQuery({ queryKey: ['aptos', owner, 'positions'], queryFn: () => readAptosPositions(owner!), enabled: !!owner });
  const balance = useQuery({ queryKey: ['aptos', owner, 'balance'], queryFn: () => readAptosBalance(owner!), enabled: !!owner });
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  async function execute(action: AptosAction) {
    if (lock.current) return;
    lock.current = true; setPending(true); setError(null); setHash(null); setConfirmed(false);
    try {
      const check = () => {
        const active = current.current;
        if (!owner || !active.connected || !active.account || aptosAddress(active.account.address.toString()) !== owner || Number(active.network?.chainId) !== 1) throw new Error('Check the connected Aptos mainnet account.');
      };
      check();
      const data = await prepareAptosAction(owner!, action);
      check();
      const submitted = await current.current.signAndSubmitTransaction(data);
      setHash(submitted.hash);
      const receipt = await aptosClient.waitForTransaction({ transactionHash: submitted.hash, options: { checkSuccess: true } });
      if (!receipt.success) throw new Error(receipt.vm_status);
      setConfirmed(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Aptos transaction failed.'); }
    finally { void cache.invalidateQueries({ queryKey: ['aptos'] }); lock.current = false; setPending(false); }
  }
  return { owner, validators, apr, positions, balance, execute, pending, error, hash, confirmed };
}
