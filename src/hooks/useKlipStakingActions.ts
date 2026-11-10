'use client';

import { waitForSuccessfulReceipt } from '@/lib/wallet/receipt';
import { useCallback } from 'react';
import { createPublicClient, http, encodeFunctionData } from 'viem';
import { useQueryClient } from '@tanstack/react-query';
import { useChainStore } from '@/stores/chainStore';
import { useKlipStore } from '@/stores/klipStore';
import { CHAIN_REGISTRY } from '@/lib/chains/registry';
import { klipExecuteContract } from '@/lib/wallet/klip';
import { PUBLIC_DELEGATION_ABI } from '@/lib/chains/kaia/contracts';
import { queryKeys } from '@/lib/queryKeys';
import type { TxResult } from './useStakingActions';
import type {
  DelegateParams,
  UndelegateParams,
  RedelegateParams,
  WithdrawParams,
  SendParams,
  CompoundParams,
  SplitRewardsParams,
} from '@/lib/chains/types';

const useKlipStakingActions = () => {
  const klipAddress = useKlipStore((state) => state.klipAddress);
  const selectedChainSlug = useChainStore((state) => state.selectedChainSlug);
  const chainConfig = CHAIN_REGISTRY[selectedChainSlug];
  const queryClient = useQueryClient();
  const evmRpc = chainConfig?.evmRpc;

  const queryAddress = klipAddress ?? '';

  const invalidateStakingQueries = useCallback(() => {
    const keys = [
      queryKeys.delegations(selectedChainSlug, queryAddress),
      queryKeys.rewards(selectedChainSlug, queryAddress),
      queryKeys.balance(selectedChainSlug, queryAddress),
      queryKeys.unbonding(selectedChainSlug, queryAddress),
    ];

    for (const queryKey of keys) {
      queryClient.invalidateQueries({ queryKey });
    }

    queryClient.invalidateQueries({
      queryKey: ['txHistory', selectedChainSlug, queryAddress],
    });
  }, [queryClient, selectedChainSlug, queryAddress]);

  const waitForTx = useCallback(
    async (txHash: string): Promise<void> => {
      if (!evmRpc) throw new Error('Transaction confirmation is unavailable. Check the explorer before retrying.');

      const client = createPublicClient({
        transport: http(evmRpc),
      });

      await waitForSuccessfulReceipt(client, txHash as `0x${string}`);
    },
    [evmRpc],
  );

  const onTxSuccess = useCallback(() => {
    invalidateStakingQueries();
    setTimeout(() => {
      invalidateStakingQueries();
    }, 2000);
  }, [invalidateStakingQueries]);

  const delegate = useCallback(
    async (params: DelegateParams): Promise<TxResult> => {
      if (!klipAddress) {
        return { success: false, txHash: null, error: 'Wallet not connected' };
      }

      const amountInPeb = BigInt(params.amount).toString();

      const calldata = encodeFunctionData({
        abi: PUBLIC_DELEGATION_ABI,
        functionName: 'stakeKaia',
      });

      const txHash = await klipExecuteContract({
        from: klipAddress,
        to: params.validatorAddress,
        value: amountInPeb,
        encodedFunctionCall: calldata,
      }).catch((error: Error) => {
        console.error('klip delegate error', error);
        return null;
      });

      if (!txHash) {
        return { success: false, txHash: null, error: 'Transaction rejected' };
      }

      await waitForTx(txHash);
      onTxSuccess();
      return { success: true, txHash, error: null };
    },
    [klipAddress, waitForTx, onTxSuccess],
  );

  const undelegate = useCallback(
    async (params: UndelegateParams): Promise<TxResult> => {
      if (!klipAddress) {
        return { success: false, txHash: null, error: 'Wallet not connected' };
      }

      const calldata = encodeFunctionData({
        abi: PUBLIC_DELEGATION_ABI,
        functionName: 'withdraw',
        args: [BigInt(params.amount), klipAddress as `0x${string}`, klipAddress as `0x${string}`],
      });

      const txHash = await klipExecuteContract({
        from: klipAddress,
        to: params.validatorAddress,
        value: '0',
        encodedFunctionCall: calldata,
      }).catch((error: Error) => {
        console.error('klip undelegate error', error);
        return null;
      });

      if (!txHash) {
        return { success: false, txHash: null, error: 'Transaction rejected' };
      }

      await waitForTx(txHash);
      onTxSuccess();
      return { success: true, txHash, error: null };
    },
    [klipAddress, waitForTx, onTxSuccess],
  );

  const redelegate = useCallback(
    async (params: RedelegateParams): Promise<TxResult> => {
      if (!klipAddress) {
        return { success: false, txHash: null, error: 'Wallet not connected' };
      }

      const calldata = encodeFunctionData({
        abi: PUBLIC_DELEGATION_ABI,
        functionName: 'redelegate',
        args: [params.dstValidatorAddress as `0x${string}`, BigInt(params.amount)],
      });

      const txHash = await klipExecuteContract({
        from: klipAddress,
        to: params.srcValidatorAddress,
        value: '0',
        encodedFunctionCall: calldata,
      }).catch((error: Error) => {
        console.error('klip redelegate error', error);
        return null;
      });

      if (!txHash) {
        return { success: false, txHash: null, error: 'Transaction rejected' };
      }

      await waitForTx(txHash);
      onTxSuccess();
      return { success: true, txHash, error: null };
    },
    [klipAddress, waitForTx, onTxSuccess],
  );

  // Kaia uses auto-compounding — no separate reward withdrawal
  const withdrawRewards = useCallback<(params: WithdrawParams) => Promise<TxResult>>(
    async (): Promise<TxResult> => {
      return { success: true, txHash: null, error: null };
    },
    [],
  );

  const send = useCallback<(params: SendParams) => Promise<TxResult>>(
    async (): Promise<TxResult> => {
      return { success: false, txHash: null, error: 'Send not supported via Klip' };
    },
    [],
  );

  // Kaia uses auto-compounding — no manual compound needed
  const compound = useCallback<(params: CompoundParams) => Promise<TxResult>>(
    async (): Promise<TxResult> => {
      return { success: true, txHash: null, error: null };
    },
    [],
  );

  // Kaia uses auto-compounding — split rewards not applicable
  const splitRewards = useCallback<(params: SplitRewardsParams) => Promise<TxResult>>(
    async (): Promise<TxResult> => {
      return { success: true, txHash: null, error: null };
    },
    [],
  );

  return {
    delegate,
    undelegate,
    redelegate,
    withdrawRewards,
    send,
    compound,
    splitRewards,
    isReady: !!klipAddress,
  };
};

export { useKlipStakingActions };
