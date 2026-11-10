'use client';

import { waitForSuccessfulReceipt } from '@/lib/wallet/receipt';
import { useRef, useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Address, Chain, Hex, PublicClient } from 'viem';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
import { executeTransactions } from '@/features/ethereum-staking/execute';
import type { StakingTransaction } from '@/features/ethereum-staking/plan';

type EvmLiquidProtocol<Action, Position> = {
  chain: Chain;
  client: PublicClient;
  chainSlug: string;
  provider: string;
  readPosition: (owner: Address) => Promise<Position>;
  prepare: (owner: Address, action: Action) => Promise<StakingTransaction[]>;
};

export function useEvmLiquidStaking<Action, Position>(protocol: EvmLiquidProtocol<Action, Position>) {
  const { address, chainId, isConnected } = useAccount();
  const { data: wallet } = useWalletClient();
  const walletType = useWalletTypeStore((state) => state.walletType);
  const enabled = walletType === 'evm' && isConnected && !!address;
  const cache = useQueryClient();
  const position = useQuery({ queryKey: [protocol.chainSlug, protocol.provider, address], queryFn: () => protocol.readPosition(address!), enabled });
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<Hex | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const execute = async (action: Action) => {
    if (lock.current) return;
    lock.current = true; setPending(true); setError(null); setHash(null); setConfirmed(false);
    try {
      if (!enabled || !wallet || !address || chainId !== protocol.chain.id) throw new Error(`Connect a ${protocol.chain.name} mainnet wallet.`);
      const checkAccount = async () => {
        const [network, accounts] = await Promise.all([wallet.getChainId(), wallet.getAddresses()]);
        if (network !== protocol.chain.id || accounts[0]?.toLowerCase() !== address.toLowerCase()) throw new Error('The wallet account or network has changed.');
      };
      await checkAccount();
      const transactions = await protocol.prepare(address, action);
      await executeTransactions(transactions, {
        checkAccount,
        simulate: (transaction) => protocol.client.estimateGas({ ...transaction, account: address }),
        send: (transaction) => wallet.sendTransaction({ ...transaction, account: address, chain: protocol.chain }),
        wait: (submittedHash) => waitForSuccessfulReceipt(protocol.client, submittedHash),
        onSubmitted: (submittedHash) => { setHash(submittedHash); setConfirmed(false); },
        onConfirmed: () => setConfirmed(true),
      });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Transaction failed.'); }
    finally { void cache.invalidateQueries({ predicate: (query) => query.queryKey.includes(protocol.chainSlug) }); lock.current = false; setPending(false); }
  };
  return { position, execute, pending, error, hash, confirmed, connected: enabled, correctNetwork: chainId === protocol.chain.id };
}
