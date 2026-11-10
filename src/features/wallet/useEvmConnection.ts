'use client';

import { useRef, useState } from 'react';
import { useAccount, useConnect, useSwitchChain } from 'wagmi';
import type { Connector } from 'wagmi';
import { useChainStore } from '@/stores/chainStore';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
import { connectSelectedWallet } from './connection';

export function useEvmConnection() {
  const { connector: activeConnector, chainId, isConnected } = useAccount();
  const { connectors, connectAsync } = useConnect();
  const { switchChainAsync } = useSwitchChain();
  const setWalletType = useWalletTypeStore((state) => state.setWalletType);
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect(connector: Connector, targetChainId: number) {
    if (lock.current) return false;
    const requestedChain = useChainStore.getState().selectedChainSlug;
    const checkChain = () => {
      if (useChainStore.getState().selectedChainSlug !== requestedChain) {
        throw new Error('The selected chain changed. Connect your wallet again on the current chain.');
      }
    };
    lock.current = true;
    setPending(true);
    setError(null);
    try {
      await connectSelectedWallet({
        selectedConnectorId: connector.uid,
        activeConnectorId: isConnected ? activeConnector?.uid : undefined,
        activeChainId: chainId,
        targetChainId,
        connect: async () => {
          const result = await connectAsync({ connector, chainId: targetChainId });
          checkChain();
          return result;
        },
        switchChain: async () => {
          checkChain();
          const result = await switchChainAsync({ chainId: targetChainId });
          checkChain();
          return result;
        },
        activate: () => { checkChain(); setWalletType('evm'); },
      });
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Wallet connection failed.');
      return false;
    } finally {
      lock.current = false;
      setPending(false);
    }
  }

  return { connectors, connect, pending, error };
}
