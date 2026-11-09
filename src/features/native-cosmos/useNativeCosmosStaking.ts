'use client';

import { useMemo, useRef, useState } from 'react';
import { useChain } from '@cosmos-kit/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SigningStargateClient, GasPrice, calculateFee, TimeoutError } from '@cosmjs/stargate';
import { parseUnits } from 'viem';
import type { ChainConfig } from '@/lib/chains/types';
import { createNativeCosmosClient } from '@/lib/chains/native-cosmos/client';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
import { buildNativeCosmosMessages } from './messages';
import type { NativeCosmosAction } from './messages';

export function useNativeCosmosStaking(config: ChainConfig) {
  const wallet = useChain(config.cosmosKitChainName!, false);
  const walletType = useWalletTypeStore((state) => state.walletType);
  const connected = wallet.isWalletConnected && walletType === 'native-cosmos';
  const address = connected ? wallet.address : undefined;
  const adapter = useMemo(() => config.createAdapter(config, '', ''), [config]);
  const client = useMemo(() => createNativeCosmosClient(config), [config]);
  const key = ['native-cosmos', config.slug];
  const validators = useQuery({ queryKey: [...key, 'validators'], queryFn: adapter.getValidators, staleTime: 60_000 });
  const balance = useQuery({ queryKey: [...key, 'balance', address], queryFn: () => adapter.getBalance(address!), enabled: !!address });
  const delegations = useQuery({ queryKey: [...key, 'delegations', address], queryFn: () => adapter.getDelegations(address!), enabled: !!address });
  const rewards = useQuery({ queryKey: [...key, 'rewards', address], queryFn: () => adapter.getRewards(address!), enabled: !!address });
  const unbonding = useQuery({ queryKey: [...key, 'unbonding', address], queryFn: () => adapter.getUnbonding(address!), enabled: !!address });
  const duration = useQuery({ queryKey: [...key, 'duration'], queryFn: client.getUnbondingSeconds, staleTime: 60_000 });
  const queryClient = useQueryClient();
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);

  async function execute(action: NativeCosmosAction) {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError(null);
    setHash(null);
    let signingClient: SigningStargateClient | undefined;
    try {
      if (!address || !config.gas) throw new Error('Connect a wallet for this chain first.');
      const messages = buildNativeCosmosMessages(config, address, action);
      const signer = wallet.getOfflineSignerAmino();
      const checkAccount = async () => {
        const accounts = await signer.getAccounts();
        if (accounts[0]?.address !== address) throw new Error('Wallet account changed. Reconnect before signing.');
      };
      await checkAccount();
      signingClient = await SigningStargateClient.connectWithSigner(config.rpc, signer);
      if (await signingClient.getChainId() !== config.id) throw new Error('RPC returned an unexpected chain ID.');
      const gas = await signingClient.simulate(address, messages, '');
      const fee = calculateFee(Math.ceil(gas * config.gas.gasAdjustment), GasPrice.fromString(config.gas.gasPrices));
      const available = await signingClient.getBalance(address, config.stakingToken.denom);
      const feeAmount = fee.amount.reduce((total, coin) => total + BigInt(coin.amount), BigInt(0));
      const amount = action.type === 'claim' ? BigInt(0) : parseUnits(action.amount, config.stakingToken.decimals);
      if (BigInt(available.amount) < feeAmount + (action.type === 'delegate' ? amount : BigInt(0))) throw new Error('Insufficient spendable balance including network fees.');
      await checkAccount();
      const result = await signingClient.signAndBroadcast(address, messages, fee);
      setHash(result.transactionHash);
      if (result.code !== 0) throw new Error(result.rawLog || `Transaction failed with code ${result.code}.`);
    } catch (cause) {
      if (cause instanceof TimeoutError) setHash(cause.txId);
      setError(cause instanceof Error ? cause.message : 'Transaction failed.');
    } finally {
      signingClient?.disconnect();
      lock.current = false;
      setPending(false);
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ predicate: (query) => query.queryKey.includes(config.slug) });
    }
  }

  return { connected, address, validators, balance, delegations, rewards, unbonding, duration, execute, pending, error, hash };
}
