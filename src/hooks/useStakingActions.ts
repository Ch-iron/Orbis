'use client';

import { useCallback } from 'react';
import { useConnectedWallet } from '@xpla/wallet-provider';
import { useQueryClient } from '@tanstack/react-query';
import { useChain } from './useChain';
import { useChainStore } from '@/stores/chainStore';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
import { useEvmStakingActions } from './useEvmStakingActions';
import { queryKeys } from '@/lib/queryKeys';
import type {
  DelegateParams,
  UndelegateParams,
  RedelegateParams,
  WithdrawParams,
  SendParams,
  CompoundParams,
  SplitRewardsParams,
} from '@/lib/chains/types';
import { CHAIN_REGISTRY } from '@/lib/chains/registry';

type TxResult = {
  success: boolean;
  txHash: string | null;
  error: string | null;
};

const useCosmosStakingActions = () => {
  const connectedWallet = useConnectedWallet();
  const { adapter } = useChain();
  const selectedChainSlug = useChainStore((state) => state.selectedChainSlug);
  const chainConfig = CHAIN_REGISTRY[selectedChainSlug];
  const queryClient = useQueryClient();

  const invalidateStakingQueries = useCallback(() => {
    const address = connectedWallet?.xplaAddress ?? '';
    const keys = [
      queryKeys.delegations(selectedChainSlug, address),
      queryKeys.rewards(selectedChainSlug, address),
      queryKeys.balance(selectedChainSlug, address),
      queryKeys.unbonding(selectedChainSlug, address),
    ];

    for (const queryKey of keys) {
      queryClient.invalidateQueries({ queryKey });
    }

    queryClient.invalidateQueries({
      queryKey: ['txHistory', selectedChainSlug, address],
    });
  }, [connectedWallet, queryClient, selectedChainSlug]);

  const postTx = useCallback(
    async (msgs: unknown[]): Promise<TxResult> => {
      if (!connectedWallet) {
        return { success: false, txHash: null, error: 'Wallet not connected' };
      }

      const result = await connectedWallet
        .post({
          msgs: msgs as any[],
          gasPrices: chainConfig?.gas?.gasPrices ?? '850000000000axpla',
          gasAdjustment: chainConfig?.gas?.gasAdjustment ?? 1.75,
        })
        .catch((error: Error) => {
          console.error('tx error', error);
          return { success: false as const, error };
        });

      if ('error' in result) {
        return {
          success: false,
          txHash: null,
          error: (result.error as Error).message,
        };
      }

      invalidateStakingQueries();
      // Follow-up invalidation as a safety net for chain indexing lag
      setTimeout(() => {
        invalidateStakingQueries();
      }, 2000);

      return {
        success: true,
        txHash: (result as any).result?.txhash ?? null,
        error: null,
      };
    },
    [connectedWallet, chainConfig, invalidateStakingQueries],
  );

  const delegate = useCallback(
    async (params: DelegateParams): Promise<TxResult> => {
      const msg = adapter.buildDelegateMsg(params);
      return postTx([msg]);
    },
    [adapter, postTx],
  );

  const undelegate = useCallback(
    async (params: UndelegateParams): Promise<TxResult> => {
      const msg = adapter.buildUndelegateMsg(params);
      return postTx([msg]);
    },
    [adapter, postTx],
  );

  const redelegate = useCallback(
    async (params: RedelegateParams): Promise<TxResult> => {
      const msg = adapter.buildRedelegateMsg(params);
      return postTx([msg]);
    },
    [adapter, postTx],
  );

  const withdrawRewards = useCallback(
    async (params: WithdrawParams): Promise<TxResult> => {
      const msgs = adapter.buildWithdrawRewardsMsg(params);
      return postTx(msgs);
    },
    [adapter, postTx],
  );

  const send = useCallback(
    async (params: SendParams): Promise<TxResult> => {
      const msg = adapter.buildSendMsg(params);
      return postTx([msg]);
    },
    [adapter, postTx],
  );

  const compound = useCallback(
    async (params: CompoundParams): Promise<TxResult> => {
      const msgs = adapter.buildCompoundMsg(params);
      return postTx(msgs);
    },
    [adapter, postTx],
  );

  const splitRewards = useCallback(
    async (params: SplitRewardsParams): Promise<TxResult> => {
      const msgs = adapter.buildSplitRewardsMsg(params);
      return postTx(msgs);
    },
    [adapter, postTx],
  );

  return {
    delegate,
    undelegate,
    redelegate,
    withdrawRewards,
    send,
    compound,
    splitRewards,
    isReady: !!connectedWallet,
  };
};

const useStakingActions = () => {
  const walletType = useWalletTypeStore((state) => state.walletType);

  // Both hooks must always be called (React hook rules)
  const cosmosActions = useCosmosStakingActions();
  const evmActions = useEvmStakingActions();

  if (walletType === 'evm') {
    return evmActions;
  }

  return cosmosActions;
};

export { useStakingActions };
export type { TxResult };
