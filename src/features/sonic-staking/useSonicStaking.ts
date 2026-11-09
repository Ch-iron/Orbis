'use client';

import { useRef, useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sonic } from 'viem/chains';
import type { Hex } from 'viem';
import { sonicClient, readSonicValidators, readSonicPositions, readSonicWithdrawals, readSonicParameters } from '@/lib/chains/sonic/client';
import { readSonicBaseApr, readSonicValidatorNames } from '@/lib/chains/sonic/indexer';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
import { executeTransactions } from '@/features/ethereum-staking/execute';
import { prepareSonicAction } from './actions';
import type { SonicAction } from './actions';

export function useSonicStaking() {
  const { address, chainId, isConnected } = useAccount();
  const { data: wallet } = useWalletClient();
  const walletType = useWalletTypeStore((state) => state.walletType);
  const enabled = walletType === 'evm' && isConnected && !!address;
  const cache = useQueryClient();
  const validators = useQuery({ queryKey: ['sonic', 'validators'], queryFn: readSonicValidators });
  const names = useQuery({ queryKey: ['sonic', 'names'], queryFn: readSonicValidatorNames });
  const apr = useQuery({ queryKey: ['sonic', 'apr'], queryFn: readSonicBaseApr });
  const parameters = useQuery({ queryKey: ['sonic', 'parameters'], queryFn: readSonicParameters });
  const balance = useQuery({ queryKey: ['sonic', address, 'balance'], queryFn: () => sonicClient.getBalance({ address: address! }), enabled });
  const positions = useQuery({ queryKey: ['sonic', address, 'positions'], queryFn: () => readSonicPositions(address!), enabled });
  const withdrawals = useQuery({ queryKey: ['sonic', address, 'withdrawals'], queryFn: () => readSonicWithdrawals(address!), enabled });
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<Hex | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const execute = async (action: SonicAction) => {
    if (lock.current) return;
    lock.current = true; setPending(true); setError(null); setHash(null); setConfirmed(false);
    try {
      if (!enabled || !wallet || !address || chainId !== sonic.id) throw new Error('Sonic 메인넷 지갑을 연결하세요.');
      const checkAccount = async () => {
        const [network, accounts] = await Promise.all([wallet.getChainId(), wallet.getAddresses()]);
        if (network !== sonic.id || accounts[0]?.toLowerCase() !== address.toLowerCase()) throw new Error('지갑 계정 또는 네트워크가 변경되었습니다.');
      };
      await checkAccount();
      const transactions = await prepareSonicAction(address, action);
      await executeTransactions(transactions, {
        checkAccount,
        simulate: (transaction) => sonicClient.estimateGas({ ...transaction, account: address }),
        send: (transaction) => wallet.sendTransaction({ ...transaction, account: address, chain: sonic }),
        wait: async (hash) => {
          let replaced = false;
          const receipt = await sonicClient.waitForTransactionReceipt({ hash, onReplaced: ({ reason }) => { if (reason !== 'repriced') replaced = true; } });
          if (replaced) throw new Error('거래가 취소되거나 변경되었습니다. 탐색기에서 확인하세요.');
          return receipt;
        },
        onSubmitted: setHash, onConfirmed: () => setConfirmed(true),
      });
    } catch (cause) { setError(cause instanceof Error ? cause.message : '거래에 실패했습니다.'); }
    finally { void cache.invalidateQueries({ predicate: (query) => query.queryKey.includes('sonic') }); lock.current = false; setPending(false); }
  };
  return { validators, names, apr, parameters, balance, positions, withdrawals, execute, pending, error, hash, confirmed, connected: enabled, correctNetwork: chainId === sonic.id };
}
