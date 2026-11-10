'use client';

import { useRef, useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { mainnet } from 'viem/chains';
import type { Hex } from 'viem';
import { polygonStakingClient, readPolygonValidators, readPolygonPositions, readPolygonWithdrawals, readPolygonBalance } from '@/lib/chains/polygon/client';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
import { executeTransactions } from '@/features/ethereum-staking/execute';
import { preparePolygonAction } from './actions';
import type { PolygonAction } from './actions';

export function usePolygonStaking() {
  const { address, chainId, isConnected } = useAccount();
  const { data: wallet } = useWalletClient();
  const walletType = useWalletTypeStore((state) => state.walletType);
  const enabled = walletType === 'evm' && isConnected && !!address;
  const cache = useQueryClient();
  const validators = useQuery({ queryKey: ['polygon', 'validators'], queryFn: readPolygonValidators });
  const balance = useQuery({ queryKey: ['polygon', address, 'balance'], queryFn: () => readPolygonBalance(address!), enabled });
  const gasBalance = useQuery({ queryKey: ['polygon', address, 'eth'], queryFn: () => polygonStakingClient.getBalance({ address: address! }), enabled });
  const positions = useQuery({ queryKey: ['polygon', address, 'positions'], queryFn: () => readPolygonPositions(address!), enabled });
  const withdrawals = useQuery({ queryKey: ['polygon', address, 'withdrawals'], queryFn: () => readPolygonWithdrawals(address!), enabled });
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<Hex | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const execute = async (action: PolygonAction) => {
    if (lock.current) return;
    lock.current = true; setPending(true); setError(null); setHash(null); setConfirmed(false);
    try {
      if (!enabled || !wallet || !address || chainId !== mainnet.id) throw new Error('Connect an Ethereum mainnet wallet.');
      const checkAccount = async () => {
        const [network, accounts] = await Promise.all([wallet.getChainId(), wallet.getAddresses()]);
        if (network !== mainnet.id || accounts[0]?.toLowerCase() !== address.toLowerCase()) throw new Error('The wallet account or network has changed.');
      };
      await checkAccount();
      const transactions = await preparePolygonAction(address, action);
      await executeTransactions(transactions, {
        checkAccount,
        simulate: (transaction) => polygonStakingClient.estimateGas({ ...transaction, account: address }),
        send: (transaction) => wallet.sendTransaction({ ...transaction, account: address, chain: mainnet }),
        wait: async (hash) => {
          let replaced = false;
          const receipt = await polygonStakingClient.waitForTransactionReceipt({ hash, onReplaced: ({ reason }) => { if (reason !== 'repriced') replaced = true; } });
          if (replaced) throw new Error('The transaction was cancelled or replaced. Check the explorer.');
          return receipt;
        },
        onSubmitted: setHash, onConfirmed: () => setConfirmed(true),
      });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Transaction failed.'); }
    finally { void cache.invalidateQueries({ predicate: (query) => query.queryKey.includes('polygon') }); lock.current = false; setPending(false); }
  };
  return { validators, gasBalance, balance, positions, withdrawals, execute, pending, error, hash, confirmed, connected: enabled, correctNetwork: chainId === mainnet.id };
}
