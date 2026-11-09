// SEI chain implementation of the StakingAdapter

import type { ChainConfig } from '../types';
import type { StakingAdapter } from '../adapter';
import type {
  Validator,
  Delegation,
  RewardInfo,
  UnbondingEntry,
  DelegateParams,
  UndelegateParams,
  RedelegateParams,
  WithdrawParams,
  SendParams,
  CompoundParams,
  SplitRewardsParams,
  TxHistoryResponse,
} from '../types';
import { mapBondStatus, resolveKeybaseLogos } from '../cosmos-utils';
import {
  SEI_STAKING_PRECOMPILE_ADDRESS,
  SEI_DISTRIBUTION_PRECOMPILE_ADDRESS,
} from './precompile';
import type { CosmosLcdClient } from './client';

// Create a SEI staking adapter bound to a specific chain config and sender
const createSeiAdapter = (
  config: ChainConfig,
  client: CosmosLcdClient,
  _senderAddress: string,
  evmAddress: string = '',
): StakingAdapter => {
  const stakingDenom = config.stakingToken.denom;

  // Resolve validator names by fetching individual validator info
  const resolveValidatorNames = async (
    addresses: string[],
  ): Promise<Record<string, string>> => {
    const uniqueAddresses = [...new Set(addresses)];
    const entries = await Promise.all(
      uniqueAddresses.map(async (address) => {
        const validatorResponse = await client.getValidator(address);
        const name = validatorResponse?.validator.description.moniker ?? address;
        return [address, name] as const;
      }),
    );
    return Object.fromEntries(entries);
  };

  type ValidatorWithIdentity = Validator & { identity: string };

  // Fetch all validators across paginated responses using recursion
  const getValidators = async (): Promise<Validator[]> => {
    const fetchPage = async (
      paginationKey: string | null,
      accumulated: ValidatorWithIdentity[],
    ): Promise<ValidatorWithIdentity[]> => {
      const response = await client.getValidators(paginationKey ?? undefined);

      const mapped = response.validators.map((validator): ValidatorWithIdentity => ({
        address: validator.operator_address,
        name: validator.description.moniker,
        identity: validator.description.identity ?? '',
        logo: null,
        commission: parseFloat(validator.commission.commission_rates.rate),
        votingPower: validator.tokens,
        status: validator.jailed ? 'jailed' as const : mapBondStatus(validator.status),
        description: validator.description.details ?? '',
      }));

      const nextAccumulated = [...accumulated, ...mapped];

      if (!response.pagination.next_key) {
        return nextAccumulated;
      }

      return fetchPage(response.pagination.next_key, nextAccumulated);
    };

    const validators = await fetchPage(null, []);

    const identities = validators.map((validator) => validator.identity);
    const logoMap = await resolveKeybaseLogos(identities);

    return validators.map(({ identity, ...validator }) => ({
      ...validator,
      logo: logoMap.get(identity) ?? null,
    }));
  };

  // Fetch delegations and resolve validator names
  const getDelegations = async (address: string): Promise<Delegation[]> => {
    const [delegationsResponse, rewardsResponse] = await Promise.all([
      client.getDelegations(address),
      client.getRewards(address),
    ]);

    const validatorAddresses = delegationsResponse.delegation_responses.map(
      (entry) => entry.delegation.validator_address,
    );
    const nameMap = await resolveValidatorNames(validatorAddresses);

    return delegationsResponse.delegation_responses.map((entry) => {
      const validatorAddress = entry.delegation.validator_address;
      const rewardEntry = rewardsResponse.rewards.find(
        (reward) => reward.validator_address === validatorAddress,
      );
      const rewardCoin = rewardEntry?.reward?.find((coin) => coin.denom === stakingDenom);
      const rewardAmount = rewardCoin ? rewardCoin.amount.split('.')[0] ?? '0' : '0';

      return {
        validatorAddress,
        validatorName: nameMap[validatorAddress] ?? validatorAddress,
        amount: entry.balance.amount,
        rewards: rewardAmount,
      };
    });
  };

  const getRewards = async (address: string): Promise<RewardInfo> => {
    const rewardsResponse = await client.getRewards(address);
    const totalCoin = rewardsResponse.total.find((coin) => coin.denom === stakingDenom);
    const totalAmount = totalCoin ? totalCoin.amount.split('.')[0] ?? '0' : '0';

    const perValidator = rewardsResponse.rewards.map((entry) => {
      const coin = entry.reward?.find((rewardCoin) => rewardCoin.denom === stakingDenom);
      const amount = coin ? coin.amount.split('.')[0] ?? '0' : '0';
      return { validatorAddress: entry.validator_address, amount };
    });

    return { total: totalAmount, perValidator };
  };

  const getUnbonding = async (address: string): Promise<UnbondingEntry[]> => {
    const response = await client.getUnbondingDelegations(address);
    const validatorAddresses = response.unbonding_responses.map(
      (entry) => entry.validator_address,
    );
    const nameMap = await resolveValidatorNames(validatorAddresses);

    return response.unbonding_responses.flatMap((unbonding) =>
      unbonding.entries.map((entry) => ({
        validatorAddress: unbonding.validator_address,
        validatorName: nameMap[unbonding.validator_address] ?? unbonding.validator_address,
        amount: entry.balance,
        completionTime: new Date(entry.completion_time),
      })),
    );
  };

  const getBalance = async (address: string): Promise<string> => {
    return client.getBalance(address, stakingDenom);
  };

  // EVM method signature (4-byte selector) to staking action type mapping
  // delegate(string): keccak256("delegate(string)")[:4]
  const EVM_METHOD_TYPE_MAP: Record<string, TxHistoryResponse['entries'][number]['type']> = {
    '0x9ddb511a': 'delegate',
    '0x8dfc8897': 'undelegate',
    '0x7dd0209d': 'redelegate',
    '0x0442b1ca': 'withdraw_rewards', // withdrawDelegationRewards
    '0xe35b426f': 'withdraw_rewards', // withdrawMultipleDelegationRewards
  };

  const STAKING_PRECOMPILES = new Set([
    SEI_STAKING_PRECOMPILE_ADDRESS.toLowerCase(),
    SEI_DISTRIBUTION_PRECOMPILE_ADDRESS.toLowerCase(),
  ]);

  // SeiStream account-level EVM tx response type
  type SeiStreamEvmTx = {
    hash: string;
    timestamp: string;
    value: string;
    status: boolean;
    height: number;
    to: string;
    from: string;
    data: string;
    method?: string;
    actionType: string;
  };

  type SeiStreamResponse = {
    items: SeiStreamEvmTx[];
    pagination: { pages: number; rows: string; currPage: number; nextPage: number | null };
  };

  const classifyEvmTx = (
    tx: SeiStreamEvmTx,
  ): { type: TxHistoryResponse['entries'][number]['type']; amount: string | null } => {
    const toAddress = (tx.to ?? '').toLowerCase();
    const methodSig = (tx.method ?? tx.data?.slice(0, 10) ?? '').toLowerCase();

    if (!STAKING_PRECOMPILES.has(toAddress)) {
      // Simple transfer — value is in wei (18 dec), convert to usei (6 dec)
      const amount = tx.value !== '0' ? (BigInt(tx.value) / BigInt(10 ** 12)).toString() : null;
      return { type: 'send', amount };
    }

    const txType = EVM_METHOD_TYPE_MAP[methodSig] ?? 'unknown';

    // For delegate, value is in wei (18 dec), convert to usei (6 dec)
    const amount = (() => {
      if (txType === 'delegate' && tx.value !== '0') {
        return (BigInt(tx.value) / BigInt(10 ** 12)).toString();
      }
      return null;
    })();

    return { type: txType, amount };
  };

  const getTransactionHistory = async (
    _address: string,
    limit: number = 20,
    page: number = 1,
  ): Promise<TxHistoryResponse> => {
    if (!evmAddress) {
      return { entries: [], total: 0 };
    }

    // Use seistream.app account-level EVM tx endpoint (SEI public LCD nodes no longer index tx events)
    const seiStreamResponse = await fetch(
      `https://api.seistream.app/accounts/evm/${encodeURIComponent(evmAddress.toLowerCase())}/transactions?page=${page}&limit=${limit}`,
    ).catch((fetchError) => {
      console.error('seistream tx history fetch error', fetchError);
      return null;
    });

    if (!seiStreamResponse?.ok) {
      return { entries: [], total: 0 };
    }

    const data: SeiStreamResponse | null = await seiStreamResponse.json().catch((parseError) => {
      console.error('seistream tx history parse error', parseError);
      return null;
    });

    if (!data?.items) {
      return { entries: [], total: 0 };
    }

    const total = parseInt(data.pagination.rows, 10);

    const entries = data.items.map((tx) => {
      const { type, amount } = classifyEvmTx(tx);

      return {
        hash: tx.hash,
        evmHash: tx.hash,
        height: tx.height,
        timestamp: new Date(tx.timestamp),
        type,
        amount,
        success: tx.status,
        memo: '',
      };
    });

    return { entries, total };
  };

  // Build*Msg methods all throw since SEI uses EVM signing
  const buildDelegateMsg = (_params: DelegateParams): unknown => {
    throw new Error('Use EVM wallet for SEI transactions');
  };

  const buildUndelegateMsg = (_params: UndelegateParams): unknown => {
    throw new Error('Use EVM wallet for SEI transactions');
  };

  const buildRedelegateMsg = (_params: RedelegateParams): unknown => {
    throw new Error('Use EVM wallet for SEI transactions');
  };

  const buildWithdrawRewardsMsg = (_params: WithdrawParams): unknown[] => {
    throw new Error('Use EVM wallet for SEI transactions');
  };

  const buildSendMsg = (_params: SendParams): unknown => {
    throw new Error('Use EVM wallet for SEI transactions');
  };

  const buildCompoundMsg = (_params: CompoundParams): unknown[] => {
    throw new Error('Use EVM wallet for SEI transactions');
  };

  const buildSplitRewardsMsg = (_params: SplitRewardsParams): unknown[] => {
    throw new Error('Use EVM wallet for SEI transactions');
  };

  return {
    getValidators,
    getDelegations,
    getRewards,
    getUnbonding,
    getBalance,
    getTransactionHistory,
    buildDelegateMsg,
    buildUndelegateMsg,
    buildRedelegateMsg,
    buildWithdrawRewardsMsg,
    buildSendMsg,
    buildCompoundMsg,
    buildSplitRewardsMsg,
  };
};

export { createSeiAdapter };
