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
import { MSG_TYPE_MAP, mapBondStatus, extractAmount } from '../cosmos-utils';
import type { CosmosLcdClient } from './client';

// Extract EVM tx hash from the hex-encoded protobuf `data` field of a Cosmos tx response.
// The EVM hash is stored as an ASCII string (0x + 64 hex chars) inside the protobuf payload.
const extractEvmHash = (hexData: string): string | null => {
  const ascii = hexData.replace(/../g, (pair) => String.fromCharCode(parseInt(pair, 16)));
  const match = ascii.match(/0x[0-9a-f]{64}/i);
  return match?.[0] ?? null;
};

// Create a SEI staking adapter bound to a specific chain config and sender
const createSeiAdapter = (
  config: ChainConfig,
  client: CosmosLcdClient,
  _senderAddress: string,
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

  // Fetch all validators across paginated responses using recursion
  const getValidators = async (): Promise<Validator[]> => {
    const fetchPage = async (
      paginationKey: string | null,
      accumulated: Validator[],
    ): Promise<Validator[]> => {
      const response = await client.getValidators(paginationKey ?? undefined);

      const mapped = response.validators.map((validator) => ({
        address: validator.operator_address,
        name: validator.description.moniker,
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

    return fetchPage(null, []);
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

  const getTransactionHistory = async (
    address: string,
    limit: number = 20,
    page: number = 1,
  ): Promise<TxHistoryResponse> => {
    const data = await client.getTxHistory(address, limit, page);

    if (!data.tx_responses) {
      return { entries: [], total: 0 };
    }

    const total = parseInt(data.total ?? '0', 10);

    const entries = data.tx_responses.map((txResponse) => {
      const firstMessage = txResponse.tx.body.messages[0] ?? {};
      const messageType = (firstMessage['@type'] as string) ?? '';
      const txType = MSG_TYPE_MAP[messageType] ?? 'unknown';

      return {
        hash: txResponse.txhash,
        evmHash: extractEvmHash(txResponse.data),
        height: Number(txResponse.height),
        timestamp: new Date(txResponse.timestamp),
        type: txType,
        amount: extractAmount(firstMessage, txType, txResponse.events ?? [], stakingDenom),
        success: txResponse.code === 0,
        memo: txResponse.tx.body.memo ?? '',
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
