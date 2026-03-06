'use client';

import { useCallback } from 'react';
import { useAccount, useWriteContract, useSendTransaction, usePublicClient } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { useChainStore } from '@/stores/chainStore';
import { CHAIN_REGISTRY } from '@/lib/chains/registry';
import { evmToBech32 } from '@/lib/utils/address';
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

// Max validator count for claimRewards batch withdrawal
const MAX_CLAIM_RETRIEVE = 100;

const BIGINT_ZERO = BigInt(0);
const BIGINT_TWO = BigInt(2);

// Floor balance to whole tokens, keeping enough remainder for gas fees.
const calculateSafeStakeAmount = (balance: bigint, oneToken: bigint): bigint => {
  const wholeTokens = (balance / oneToken) * oneToken;

  if (wholeTokens === BIGINT_ZERO) {
    return BIGINT_ZERO;
  }

  const fractional = balance - wholeTokens;
  const halfToken = oneToken / BIGINT_TWO;

  if (fractional <= halfToken) {
    return wholeTokens - oneToken;
  }

  return wholeTokens;
};

// Distribute total stake amount proportionally among validators
const distributeProportionally = (
  totalStakeAmount: bigint,
  delegations: Array<{ validatorAddress: string; amount: string }>,
): Array<{ validatorAddress: string; amount: bigint }> => {
  const totalOriginal = delegations.reduce(
    (sum, delegation) => sum + BigInt(delegation.amount),
    BIGINT_ZERO,
  );

  if (totalOriginal === BIGINT_ZERO || totalStakeAmount <= BIGINT_ZERO) {
    return [];
  }

  const allocations = delegations.map((delegation, index) => {
    if (index === delegations.length - 1) {
      const priorSum = delegations
        .slice(0, -1)
        .reduce(
          (sum, prior) => sum + (BigInt(prior.amount) * totalStakeAmount) / totalOriginal,
          BIGINT_ZERO,
        );
      return {
        validatorAddress: delegation.validatorAddress,
        amount: totalStakeAmount - priorSum,
      };
    }

    return {
      validatorAddress: delegation.validatorAddress,
      amount: (BigInt(delegation.amount) * totalStakeAmount) / totalOriginal,
    };
  });

  return allocations.filter((delegation) => delegation.amount > BIGINT_ZERO);
};

const useEvmStakingActions = () => {
  const { address: evmAddress } = useAccount();
  const selectedChainSlug = useChainStore((state) => state.selectedChainSlug);
  const chainConfig = CHAIN_REGISTRY[selectedChainSlug];
  const evmChainId = chainConfig?.evmChainId as number;
  const publicClient = usePublicClient({ chainId: evmChainId });
  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();
  const queryClient = useQueryClient();

  const bech32Prefix = chainConfig?.bech32Prefix ?? 'xpla';
  const bech32Address = evmAddress ? evmToBech32(evmAddress, bech32Prefix) : '';
  const precompile = chainConfig?.evmPrecompile;

  const stakingPrecompileAddress = precompile?.stakingAddress ?? '0x0000000000000000000000000000000000000800';
  const distributionPrecompileAddress = precompile?.distributionAddress ?? '0x0000000000000000000000000000000000000801';

  const tokenDecimals = chainConfig?.stakingToken.decimals ?? 18;
  const oneToken = BigInt(10) ** BigInt(tokenDecimals);

  const invalidateStakingQueries = useCallback(() => {
    const keys = [
      queryKeys.delegations(selectedChainSlug, bech32Address),
      queryKeys.rewards(selectedChainSlug, bech32Address),
      queryKeys.balance(selectedChainSlug, bech32Address),
      queryKeys.unbonding(selectedChainSlug, bech32Address),
    ];

    for (const queryKey of keys) {
      queryClient.invalidateQueries({ queryKey });
    }

    queryClient.invalidateQueries({
      queryKey: ['txHistory', selectedChainSlug, bech32Address],
    });
  }, [queryClient, selectedChainSlug, bech32Address]);

  const waitForTx = useCallback(
    async (txHash: `0x${string}`): Promise<void> => {
      if (!publicClient) {
        return;
      }
      await publicClient.waitForTransactionReceipt({ hash: txHash });
    },
    [publicClient],
  );

  const onTxSuccess = useCallback(() => {
    invalidateStakingQueries();
    setTimeout(() => {
      invalidateStakingQueries();
    }, 2000);
  }, [invalidateStakingQueries]);

  // Build delegate contract call args based on precompile config
  const buildDelegateCall = useCallback(
    (validatorAddress: string, amount: bigint) => {
      const decimalShift = precompile?.delegate.decimalShift ?? 0;
      const evmAmount = decimalShift > 0 ? amount * BigInt(10 ** decimalShift) : amount;

      if (precompile?.delegate.includesDelegatorAddress) {
        return writeContractAsync({
          chainId: evmChainId,
          address: stakingPrecompileAddress as `0x${string}`,
          abi: precompile.stakingAbi as any,
          functionName: 'delegate',
          args: [evmAddress, validatorAddress, amount],
        });
      }

      return writeContractAsync({
        chainId: evmChainId,
        address: stakingPrecompileAddress as `0x${string}`,
        abi: (precompile?.stakingAbi ?? []) as any,
        functionName: 'delegate',
        args: [validatorAddress],
        value: evmAmount,
      });
    },
    [evmAddress, evmChainId, precompile, stakingPrecompileAddress, writeContractAsync],
  );

  // Build withdraw rewards contract call based on precompile config
  const buildWithdrawCall = useCallback(
    (validatorAddresses: string[]) => {
      const withdrawConfig = precompile?.withdrawRewards;

      if (withdrawConfig?.argStyle === 'validator-list') {
        return writeContractAsync({
          chainId: evmChainId,
          address: distributionPrecompileAddress as `0x${string}`,
          abi: (precompile?.distributionAbi ?? []) as any,
          functionName: withdrawConfig.functionName,
          args: [validatorAddresses],
        });
      }

      // delegator-max style (e.g. XPLA claimRewards)
      return writeContractAsync({
        chainId: evmChainId,
        address: distributionPrecompileAddress as `0x${string}`,
        abi: (precompile?.distributionAbi ?? []) as any,
        functionName: withdrawConfig?.functionName ?? 'claimRewards',
        args: [evmAddress, MAX_CLAIM_RETRIEVE],
      });
    },
    [evmAddress, evmChainId, precompile, distributionPrecompileAddress, writeContractAsync],
  );

  const delegate = useCallback(
    async (params: DelegateParams): Promise<TxResult> => {
      if (!evmAddress) {
        return { success: false, txHash: null, error: 'Wallet not connected' };
      }

      const txHash = await buildDelegateCall(
        params.validatorAddress,
        BigInt(params.amount),
      ).catch((error: Error) => {
        console.error('evm delegate error', error);
        return null;
      });

      if (!txHash) {
        return { success: false, txHash: null, error: 'Transaction rejected' };
      }

      await waitForTx(txHash);
      onTxSuccess();
      return { success: true, txHash, error: null };
    },
    [evmAddress, buildDelegateCall, waitForTx, onTxSuccess],
  );

  const undelegate = useCallback(
    async (params: UndelegateParams): Promise<TxResult> => {
      if (!evmAddress) {
        return { success: false, txHash: null, error: 'Wallet not connected' };
      }

      const txHash = await (() => {
        if (precompile?.undelegate.includesDelegatorAddress) {
          return writeContractAsync({
            chainId: evmChainId,
            address: stakingPrecompileAddress as `0x${string}`,
            abi: precompile.stakingAbi as any,
            functionName: 'undelegate',
            args: [evmAddress, params.validatorAddress, BigInt(params.amount)],
          });
        }

        return writeContractAsync({
          chainId: evmChainId,
          address: stakingPrecompileAddress as `0x${string}`,
          abi: (precompile?.stakingAbi ?? []) as any,
          functionName: 'undelegate',
          args: [params.validatorAddress, BigInt(params.amount)],
        });
      })().catch((error: Error) => {
        console.error('evm undelegate error', error);
        return null;
      });

      if (!txHash) {
        return { success: false, txHash: null, error: 'Transaction rejected' };
      }

      await waitForTx(txHash);
      onTxSuccess();
      return { success: true, txHash, error: null };
    },
    [evmAddress, evmChainId, precompile, stakingPrecompileAddress, writeContractAsync, waitForTx, onTxSuccess],
  );

  const redelegate = useCallback(
    async (params: RedelegateParams): Promise<TxResult> => {
      if (!evmAddress) {
        return { success: false, txHash: null, error: 'Wallet not connected' };
      }

      const txHash = await (() => {
        if (precompile?.redelegate.includesDelegatorAddress) {
          return writeContractAsync({
            chainId: evmChainId,
            address: stakingPrecompileAddress as `0x${string}`,
            abi: precompile.stakingAbi as any,
            functionName: 'redelegate',
            args: [evmAddress, params.srcValidatorAddress, params.dstValidatorAddress, BigInt(params.amount)],
          });
        }

        return writeContractAsync({
          chainId: evmChainId,
          address: stakingPrecompileAddress as `0x${string}`,
          abi: (precompile?.stakingAbi ?? []) as any,
          functionName: 'redelegate',
          args: [params.srcValidatorAddress, params.dstValidatorAddress, BigInt(params.amount)],
        });
      })().catch((error: Error) => {
        console.error('evm redelegate error', error);
        return null;
      });

      if (!txHash) {
        return { success: false, txHash: null, error: 'Transaction rejected' };
      }

      await waitForTx(txHash);
      onTxSuccess();
      return { success: true, txHash, error: null };
    },
    [evmAddress, evmChainId, precompile, stakingPrecompileAddress, writeContractAsync, waitForTx, onTxSuccess],
  );

  const withdrawRewards = useCallback(
    async (params: WithdrawParams): Promise<TxResult> => {
      if (!evmAddress) {
        return { success: false, txHash: null, error: 'Wallet not connected' };
      }

      const txHash = await buildWithdrawCall(params.validatorAddresses).catch((error: Error) => {
        console.error('evm withdrawRewards error', error);
        return null;
      });

      if (!txHash) {
        return { success: false, txHash: null, error: 'Transaction rejected' };
      }

      await waitForTx(txHash);
      onTxSuccess();
      return { success: true, txHash, error: null };
    },
    [evmAddress, buildWithdrawCall, waitForTx, onTxSuccess],
  );

  const send = useCallback(
    async (params: SendParams): Promise<TxResult> => {
      if (!evmAddress) {
        return { success: false, txHash: null, error: 'Wallet not connected' };
      }

      const txHash = await sendTransactionAsync({
        chainId: evmChainId,
        to: params.toAddress as `0x${string}`,
        value: BigInt(params.amount),
      }).catch((error: Error) => {
        console.error('evm send error', error);
        return null;
      });

      if (!txHash) {
        return { success: false, txHash: null, error: 'Transaction rejected' };
      }

      await waitForTx(txHash);
      onTxSuccess();
      return { success: true, txHash, error: null };
    },
    [evmAddress, evmChainId, sendTransactionAsync, waitForTx, onTxSuccess],
  );

  const compound = useCallback(
    async (params: CompoundParams): Promise<TxResult> => {
      if (!evmAddress || !publicClient) {
        return { success: false, txHash: null, error: 'Wallet not connected' };
      }

      // Step 1: Claim all rewards
      const validatorAddresses = params.delegations.map((delegation) => delegation.validatorAddress);
      const claimTxHash = await buildWithdrawCall(validatorAddresses).catch((error: Error) => {
        console.error('evm compound claimRewards error', error);
        return null;
      });

      if (!claimTxHash) {
        return { success: false, txHash: null, error: 'Reward claim rejected' };
      }

      await waitForTx(claimTxHash);

      // Step 2: Query balance and calculate safe stake amount
      const balance = await publicClient.getBalance({ address: evmAddress });
      const safeStakeAmount = calculateSafeStakeAmount(balance, oneToken);

      if (safeStakeAmount <= BIGINT_ZERO) {
        onTxSuccess();
        return { success: true, txHash: claimTxHash, error: null };
      }

      // Step 3: Distribute proportionally
      const adjustedDelegations = distributeProportionally(safeStakeAmount, params.delegations);

      if (adjustedDelegations.length === 0) {
        onTxSuccess();
        return { success: true, txHash: claimTxHash, error: null };
      }

      // Step 4: Delegate to each validator sequentially
      for (const delegation of adjustedDelegations) {
        const delegateTxHash = await buildDelegateCall(
          delegation.validatorAddress,
          delegation.amount,
        ).catch((error: Error) => {
          console.error('evm compound delegate error', error);
          return null;
        });

        if (!delegateTxHash) {
          onTxSuccess();
          return {
            success: false,
            txHash: claimTxHash,
            error: `Rewards claimed but delegation to ${delegation.validatorAddress} failed`,
          };
        }

        await waitForTx(delegateTxHash);
      }

      onTxSuccess();
      return { success: true, txHash: claimTxHash, error: null };
    },
    [evmAddress, publicClient, oneToken, buildDelegateCall, buildWithdrawCall, waitForTx, onTxSuccess],
  );

  const splitRewards = useCallback(
    async (params: SplitRewardsParams): Promise<TxResult> => {
      if (!evmAddress || !publicClient) {
        return { success: false, txHash: null, error: 'Wallet not connected' };
      }

      // Step 1: Claim rewards
      const validatorAddresses = params.delegations.map((delegation) => delegation.validatorAddress);
      const claimTxHash = await buildWithdrawCall(validatorAddresses).catch((error: Error) => {
        console.error('evm splitRewards claimRewards error', error);
        return null;
      });

      if (!claimTxHash) {
        return { success: false, txHash: null, error: 'Reward claim rejected' };
      }

      await waitForTx(claimTxHash);

      // Step 2: Send to exchange
      const sendTxHash = await sendTransactionAsync({
        chainId: evmChainId,
        to: params.toAddress as `0x${string}`,
        value: BigInt(params.exchangeAmount),
      }).catch((error: Error) => {
        console.error('evm splitRewards send error', error);
        return null;
      });

      if (!sendTxHash) {
        onTxSuccess();
        return {
          success: false,
          txHash: claimTxHash,
          error: 'Rewards claimed but exchange transfer failed',
        };
      }

      await waitForTx(sendTxHash);

      // Step 3: Query remaining balance
      const balance = await publicClient.getBalance({ address: evmAddress });
      const safeStakeAmount = calculateSafeStakeAmount(balance, oneToken);

      if (safeStakeAmount <= BIGINT_ZERO) {
        onTxSuccess();
        return { success: true, txHash: claimTxHash, error: null };
      }

      // Step 4: Distribute proportionally
      const adjustedDelegations = distributeProportionally(safeStakeAmount, params.delegations);

      if (adjustedDelegations.length === 0) {
        onTxSuccess();
        return { success: true, txHash: claimTxHash, error: null };
      }

      // Step 5: Delegate to each validator sequentially
      for (const delegation of adjustedDelegations) {
        const delegateTxHash = await buildDelegateCall(
          delegation.validatorAddress,
          delegation.amount,
        ).catch((error: Error) => {
          console.error('evm splitRewards delegate error', error);
          return null;
        });

        if (!delegateTxHash) {
          onTxSuccess();
          return {
            success: false,
            txHash: claimTxHash,
            error: `Rewards claimed and sent to exchange, but delegation to ${delegation.validatorAddress} failed`,
          };
        }

        await waitForTx(delegateTxHash);
      }

      onTxSuccess();
      return { success: true, txHash: claimTxHash, error: null };
    },
    [evmAddress, evmChainId, publicClient, oneToken, buildDelegateCall, buildWithdrawCall, sendTransactionAsync, waitForTx, onTxSuccess],
  );

  return {
    delegate,
    undelegate,
    redelegate,
    withdrawRewards,
    send,
    compound,
    splitRewards,
    isReady: !!evmAddress,
  };
};

export { useEvmStakingActions };
