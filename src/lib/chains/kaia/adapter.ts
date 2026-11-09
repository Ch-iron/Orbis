// Kaia chain implementation of the StakingAdapter

import type { StakingAdapter } from '../adapter';
import type {
  Validator,
  Delegation,
  RewardInfo,
  UnbondingEntry,
  TxHistoryResponse,
} from '../types';
import type { KaiaClient, CouncilEntry } from './client';
import type { Address } from 'viem';

// Method signatures for classifying Kaiascan transactions
const KAIA_METHOD_TYPE_MAP: Record<string, TxHistoryResponse['entries'][number]['type']> = {
  '0xd5839da5': 'delegate', // stakeKaia()
  '0xb460af94': 'undelegate', // withdraw(uint256,address,address)
  '0x379607f5': 'unknown', // claim(uint256) — mapped to unknown since no dedicated type
  '0x76c70cb2': 'redelegate', // redelegate(address,uint256)
};

// Keep council metadata local to this adapter instance.
const createKaiaAdapter = (client: KaiaClient): StakingAdapter => {
  // Cache for PD address -> council entry mapping
  const cachedCouncilEntries: Map<string, CouncilEntry> = new Map();

  const getValidators = async (): Promise<Validator[]> => {
    const councilList = await client.getCouncilList();

    if (councilList.length === 0) {
      return [];
    }

    for (const entry of councilList) {
      if (entry.pdAddress) {
        cachedCouncilEntries.set(entry.pdAddress.toLowerCase(), entry);
      }
    }

    // total_staking is in KAIA units — convert to peb (18 decimals) for votingPower
    return councilList.map((entry) => ({
      address: entry.pdAddress ?? entry.nodeAddress,
      name: entry.name,
      logo: entry.thumbnail ?? null,
      commission: entry.commission,
      votingPower: (BigInt(entry.totalStaking) * BigInt(10 ** 18)).toString(),
      status: 'active' as const,
      description: '',
      apy: entry.apy,
      delegatable: entry.pdAddress !== null,
    }));
  };

  const getDelegations = async (address: string): Promise<Delegation[]> => {
    if (!address) {
      return [];
    }

    const userAddress = address as Address;

    if (cachedCouncilEntries.size === 0) {
      await getValidators();
    }

    const delegations = await Promise.all(
      Array.from(cachedCouncilEntries.values()).map(async (entry) => {
        if (!entry.pdAddress) {
          return null;
        }

        const pdAddress = entry.pdAddress as Address;
        const shares = await client.getUserShares(pdAddress, userAddress);

        if (shares === BigInt(0)) {
          return null;
        }

        const assets = await client.convertToAssets(pdAddress, shares);

        return {
          validatorAddress: pdAddress,
          validatorName: entry.name,
          amount: assets.toString(),
          // Kaia uses auto-compounding (pdKAIA value increases), no separate pending rewards
          rewards: '0',
        };
      }),
    );

    return delegations.filter((delegation): delegation is NonNullable<typeof delegation> => delegation !== null);
  };

  // Kaia PublicDelegation is auto-compounding — rewards are reflected in pdKAIA value increase
  const getRewards = async (): Promise<RewardInfo> => {
    return { total: '0', perValidator: [] };
  };

  const getUnbonding = async (address: string): Promise<UnbondingEntry[]> => {
    if (!address) {
      return [];
    }

    const userAddress = address as Address;

    if (cachedCouncilEntries.size === 0) {
      await getValidators();
    }

    const allRequests = await Promise.all(
      Array.from(cachedCouncilEntries.values()).map(async (entry) => {
        if (!entry.pdAddress) {
          return [];
        }

        const pdAddress = entry.pdAddress as Address;
        const requests = await client.getWithdrawalRequests(pdAddress, userAddress);

        return requests
          .filter((request) => !request.claimed)
          .map((request) => ({
            validatorAddress: pdAddress,
            validatorName: entry.name,
            amount: request.amount.toString(),
            completionTime: new Date(Number(request.withdrawableFrom) * 1000),
          }));
      }),
    );

    return allRequests.flat();
  };

  const getBalance = async (address: string): Promise<string> => {
    if (!address) {
      return '0';
    }

    const balance = await client.getBalance(address as Address);
    return balance.toString();
  };

  const getTransactionHistory = async (
    address: string,
    limit: number = 20,
    page: number = 1,
  ): Promise<TxHistoryResponse> => {
    if (!address) {
      return { entries: [], total: 0 };
    }

    const data = await client.getTransactionHistory(address, page, limit);

    const entries = data.results.map((tx) => {
      const methodSig = (tx.methodId ?? '').toLowerCase();
      const txType = KAIA_METHOD_TYPE_MAP[methodSig] ?? (() => {
        if (tx.value && tx.value !== '0') {
          return 'send' as const;
        }
        return 'unknown' as const;
      })();

      return {
        hash: tx.txHash,
        evmHash: tx.txHash,
        height: tx.blockNumber,
        timestamp: new Date(tx.createdAt),
        type: txType,
        amount: tx.value !== '0' ? tx.value : null,
        success: tx.status === 1,
        memo: '',
      };
    });

    return { entries, total: data.totalCount };
  };

  const unsupported = (): never => {
    throw new Error('Use EVM wallet for Kaia transactions');
  };

  return {
    getValidators,
    getDelegations,
    getRewards,
    getUnbonding,
    getBalance,
    getTransactionHistory,
    buildDelegateMsg: unsupported,
    buildUndelegateMsg: unsupported,
    buildRedelegateMsg: unsupported,
    buildWithdrawRewardsMsg: unsupported,
    buildSendMsg: unsupported,
    buildCompoundMsg: unsupported,
    buildSplitRewardsMsg: unsupported,
  };
};

export { createKaiaAdapter };
