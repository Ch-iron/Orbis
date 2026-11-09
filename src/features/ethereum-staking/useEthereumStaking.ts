'use client';

import { useRef, useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { mainnet } from 'viem/chains';
import type { Hex } from 'viem';
import { ethereumClient, readEthereumPositions, readLidoWithdrawals, readLidoLimits, readRocketPool } from '@/lib/chains/ethereum/client';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
import { executeTransactions } from './execute';
import { prepareEthereumAction } from './actions';
import type { EthereumAction } from './actions';

export function useEthereumStaking() {
  const { address, chainId, isConnected } = useAccount();
  const walletType = useWalletTypeStore((state) => state.walletType);
  const { data: wallet } = useWalletClient();
  const queryClient = useQueryClient();
  const enabled = isConnected && walletType === 'evm' && !!address;
  const positions = useQuery({ queryKey: ['ethereum-staking', 'positions', address], queryFn: () => readEthereumPositions(address!), enabled, staleTime: 15_000 });
  const withdrawals = useQuery({ queryKey: ['ethereum-staking', 'withdrawals', address], queryFn: () => readLidoWithdrawals(address!), enabled, staleTime: 15_000 });
  const lido = useQuery({ queryKey: ['ethereum-staking', 'lido', address], queryFn: () => readLidoLimits(address!), enabled, staleTime: 15_000 });
  const rocket = useQuery({ queryKey: ['ethereum-staking', 'rocket'], queryFn: readRocketPool, staleTime: 15_000 });
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hashes, setHashes] = useState<Hex[]>([]);
  const [confirmedHashes, setConfirmedHashes] = useState<Hex[]>([]);

  async function execute(action: EthereumAction) {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError(null);
    setHashes([]);
    setConfirmedHashes([]);
    try {
      if (!enabled || !address || !wallet || chainId !== mainnet.id) throw new Error('Connect your wallet to Ethereum Mainnet first.');
      const checkAccount = async () => {
        const [currentChain, accounts] = await Promise.all([wallet.getChainId(), wallet.getAddresses()]);
        if (currentChain !== mainnet.id || accounts[0]?.toLowerCase() !== address.toLowerCase()) {
          throw new Error('Wallet account or network changed. Reconnect and try again.');
        }
      };
      await checkAccount();
      const transactions = await prepareEthereumAction(address, action);
      await executeTransactions(transactions, {
        checkAccount,
        simulate: (transaction) => ethereumClient.estimateGas({ ...transaction, account: address }),
        send: (transaction) => wallet.sendTransaction({ ...transaction, account: address, chain: mainnet }),
        wait: async (hash) => {
          let replaced = false;
          const receipt = await ethereumClient.waitForTransactionReceipt({
            hash,
            onReplaced: ({ reason }) => { if (reason !== 'repriced') replaced = true; },
          });
          if (replaced) throw new Error('Transaction was cancelled or replaced. Check the explorer before trying again.');
          return receipt;
        },
        onSubmitted: (hash) => setHashes((previous) => [...previous, hash]),
        onConfirmed: (hash) => setConfirmedHashes((previous) => [...previous, hash]),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Transaction failed.');
    } finally {
      void queryClient.invalidateQueries({ queryKey: ['ethereum-staking'] });
      void queryClient.invalidateQueries({ predicate: (query) => query.queryKey.includes('ethereum') });
      lock.current = false;
      setPending(false);
    }
  }

  return { positions, withdrawals, lido, rocket, execute, pending, error, hashes, confirmedHashes, connected: enabled, correctNetwork: chainId === mainnet.id };
}
