'use client';

import { useRef, useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { iotex } from 'viem/chains';
import type { Hex } from 'viem';
import { iotexClient, readIotexCandidates, readIotexBuckets } from '@/lib/chains/iotex/client';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
import { executeTransactions } from '@/features/ethereum-staking/execute';
import { prepareIotexAction } from './actions';
import type { IotexAction } from './actions';

export function useIotexStaking() {
  const { address, chainId, isConnected } = useAccount();
  const { data: wallet } = useWalletClient();
  const walletType = useWalletTypeStore((state) => state.walletType);
  const enabled = walletType === 'evm' && isConnected && !!address;
  const cache = useQueryClient();
  const candidates = useQuery({ queryKey: ['iotex', 'candidates'], queryFn: readIotexCandidates });
  const balance = useQuery({ queryKey: ['iotex', address, 'balance'], queryFn: () => iotexClient.getBalance({ address: address! }), enabled });
  const buckets = useQuery({ queryKey: ['iotex', address, 'buckets'], queryFn: () => readIotexBuckets(address!), enabled });
  const block = useQuery({ queryKey: ['iotex', 'block'], queryFn: () => iotexClient.getBlock(), refetchInterval: 30_000 });
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<Hex | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const execute = async (action: IotexAction) => {
    if (lock.current) return;
    lock.current = true; setPending(true); setError(null); setHash(null); setConfirmed(false);
    try {
      if (!enabled || !wallet || !address || chainId !== iotex.id) throw new Error('Connect an IoTeX mainnet wallet.');
      const checkAccount = async () => {
        const [network, accounts] = await Promise.all([wallet.getChainId(), wallet.getAddresses()]);
        if (network !== iotex.id || accounts[0]?.toLowerCase() !== address.toLowerCase()) throw new Error('The wallet account or network has changed.');
      };
      await checkAccount();
      const transactions = await prepareIotexAction(address, action);
      await executeTransactions(transactions, {
        checkAccount,
        simulate: (transaction) => iotexClient.estimateGas({ ...transaction, account: address }),
        send: (transaction) => wallet.sendTransaction({ ...transaction, account: address, chain: iotex }),
        wait: async (hash) => {
          let replaced = false;
          const receipt = await iotexClient.waitForTransactionReceipt({ hash, onReplaced: ({ reason }) => { if (reason !== 'repriced') replaced = true; } });
          if (replaced) throw new Error('The transaction was cancelled or replaced. Check the explorer.');
          return receipt;
        },
        onSubmitted: setHash, onConfirmed: () => setConfirmed(true),
      });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Transaction failed.'); }
    finally { void cache.invalidateQueries({ predicate: (query) => query.queryKey.includes('iotex') }); lock.current = false; setPending(false); }
  };
  return { candidates, balance, buckets, block, execute, pending, error, hash, confirmed, connected: enabled, correctNetwork: chainId === iotex.id };
}
