// XPLA chain implementation of the StakingAdapter

import {
  LCDClient,
  Coin,
  Coins,
  MsgDelegate,
  MsgUndelegate,
  MsgBeginRedelegate,
  MsgWithdrawDelegatorReward,
  MsgSend,
} from '@xpla/xpla.js';
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
import type { TxEvent } from '../cosmos-utils';

// Fetch all validators across paginated responses using recursion
const fetchAllValidators = async (lcd: LCDClient): Promise<Validator[]> => {
  const fetchPage = async (
    currentKey: string | null,
    accumulated: Validator[],
  ): Promise<Validator[]> => {
    const paginationParams = currentKey
      ? { 'pagination.key': currentKey }
      : {};

    const [validators, pagination] = await lcd.staking.validators(
      paginationParams,
    );

    const mapped = validators.map((validator) => ({
      address: validator.operator_address,
      name: validator.description.moniker,
      logo: null,
      commission: parseFloat(
        validator.commission.commission_rates.rate.toString(),
      ),
      votingPower: validator.tokens.toString(),
      status: validator.jailed ? 'jailed' as const : mapBondStatus(validator.status),
      description: validator.description.details ?? '',
    }));

    const nextAccumulated = [...accumulated, ...mapped];

    if (!pagination?.next_key) {
      return nextAccumulated;
    }

    return fetchPage(pagination.next_key, nextAccumulated);
  };

  return fetchPage(null, []);
};

// Create an XPLA staking adapter bound to a specific chain config and sender
const createXplaAdapter = (
  config: ChainConfig,
  lcd: LCDClient,
  senderAddress: string,
): StakingAdapter => {
  const stakingDenom = config.stakingToken.denom;

  const getValidators = async (): Promise<Validator[]> => {
    return fetchAllValidators(lcd);
  };

  const resolveValidatorNames = async (
    addresses: string[],
  ): Promise<Record<string, string>> => {
    const uniqueAddresses = [...new Set(addresses)];
    const entries = await Promise.all(
      uniqueAddresses.map(async (address) => {
        const validator = await lcd.staking.validator(address).catch(() => null);
        const name = validator?.description.moniker ?? address;
        return [address, name] as const;
      }),
    );
    return Object.fromEntries(entries);
  };

  const getDelegations = async (
    address: string,
  ): Promise<Delegation[]> => {
    const [delegations] = await lcd.staking.delegations(address);
    const rewardsResponse = await lcd.distribution.rewards(address);
    const validatorAddresses = delegations.map((delegation) => delegation.validator_address);
    const nameMap = await resolveValidatorNames(validatorAddresses);

    return delegations.map((delegation) => {
      const validatorAddress = delegation.validator_address;
      const rewardCoins = rewardsResponse.rewards[validatorAddress];
      const rewardCoin = rewardCoins?.get(stakingDenom);
      // DecCoin amounts may include decimals — truncate to integer (axpla)
      const rewardAmount = rewardCoin
        ? rewardCoin.amount.toString().split('.')[0] ?? '0'
        : '0';

      return {
        validatorAddress,
        validatorName: nameMap[validatorAddress] ?? validatorAddress,
        amount: delegation.balance.amount.toString(),
        rewards: rewardAmount,
      };
    });
  };

  const getRewards = async (address: string): Promise<RewardInfo> => {
    const rewardsResponse = await lcd.distribution.rewards(address);
    const totalCoin = rewardsResponse.total.get(stakingDenom);
    // DecCoin amounts may include decimals — truncate to integer (axpla)
    const totalAmount = totalCoin
      ? totalCoin.amount.toString().split('.')[0] ?? '0'
      : '0';

    const perValidator = Object.entries(rewardsResponse.rewards).map(
      ([validatorAddress, coins]) => {
        const coin = coins.get(stakingDenom);
        const amount = coin
          ? coin.amount.toString().split('.')[0] ?? '0'
          : '0';
        return { validatorAddress, amount };
      },
    );

    return {
      total: totalAmount,
      perValidator,
    };
  };

  const getUnbonding = async (
    address: string,
  ): Promise<UnbondingEntry[]> => {
    const [unbondingDelegations] =
      await lcd.staking.unbondingDelegations(address);
    const validatorAddresses = unbondingDelegations.map((unbonding) => unbonding.validator_address);
    const nameMap = await resolveValidatorNames(validatorAddresses);

    return unbondingDelegations.flatMap((unbonding) =>
      unbonding.entries.map((entry) => ({
        validatorAddress: unbonding.validator_address,
        validatorName: nameMap[unbonding.validator_address] ?? unbonding.validator_address,
        amount: entry.balance.toString(),
        completionTime: entry.completion_time,
      })),
    );
  };

  const getBalance = async (address: string): Promise<string> => {
    const [coins] = await lcd.bank.balance(address);
    const stakingCoin = coins.get(stakingDenom);

    if (!stakingCoin) {
      return '0';
    }

    return stakingCoin.amount.toString();
  };

  const getTransactionHistory = async (
    address: string,
    limit: number = 20,
    page: number = 1,
  ): Promise<TxHistoryResponse> => {
    const queryString = `query=message.sender%3D'${address}'&order_by=ORDER_BY_DESC&limit=${limit}&page=${page}`;

    const response = await fetch(
      `${config.lcd}/cosmos/tx/v1beta1/txs?${queryString}`,
    ).catch((fetchError) => {
      console.error('tx history fetch error', fetchError);
      return null;
    });

    if (!response?.ok) {
      return { entries: [], total: 0 };
    }

    const data = await response.json().catch((parseError) => {
      console.error('tx history parse error', parseError);
      return null;
    });

    if (!data?.tx_responses) {
      return { entries: [], total: 0 };
    }

    const total = parseInt(data.total ?? '0', 10);

    const txResponses = data.tx_responses as Array<{
      txhash: string;
      height: string;
      timestamp: string;
      code: number;
      events: TxEvent[];
      tx: {
        body: {
          messages: Array<Record<string, unknown>>;
          memo: string;
        };
      };
    }>;

    const entries = txResponses.map((txResponse) => {
      const firstMessage = txResponse.tx.body.messages[0] ?? {};
      const messageType = (firstMessage['@type'] as string) ?? '';
      const txType = MSG_TYPE_MAP[messageType] ?? 'unknown';

      return {
        hash: txResponse.txhash,
        evmHash: null,
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

  const buildDelegateMsg = (params: DelegateParams): unknown => {
    return new MsgDelegate(
      senderAddress,
      params.validatorAddress,
      new Coin(stakingDenom, params.amount),
    );
  };

  const buildUndelegateMsg = (params: UndelegateParams): unknown => {
    return new MsgUndelegate(
      senderAddress,
      params.validatorAddress,
      new Coin(stakingDenom, params.amount),
    );
  };

  const buildRedelegateMsg = (params: RedelegateParams): unknown => {
    return new MsgBeginRedelegate(
      senderAddress,
      params.srcValidatorAddress,
      params.dstValidatorAddress,
      new Coin(stakingDenom, params.amount),
    );
  };

  const buildWithdrawRewardsMsg = (
    params: WithdrawParams,
  ): unknown[] => {
    return params.validatorAddresses.map(
      (validatorAddress) =>
        new MsgWithdrawDelegatorReward(senderAddress, validatorAddress),
    );
  };

  const buildSendMsg = (params: SendParams): unknown => {
    return new MsgSend(
      senderAddress,
      params.toAddress,
      new Coins([new Coin(stakingDenom, params.amount)]),
    );
  };

  const buildCompoundMsg = (params: CompoundParams): unknown[] => {
    // Compound = withdraw all rewards + re-delegate them
    const withdrawMsgs = params.delegations.map(
      (delegation) =>
        new MsgWithdrawDelegatorReward(
          senderAddress,
          delegation.validatorAddress,
        ),
    );

    const delegateMsgs = params.delegations.map(
      (delegation) =>
        new MsgDelegate(
          senderAddress,
          delegation.validatorAddress,
          new Coin(stakingDenom, delegation.amount),
        ),
    );

    return [...withdrawMsgs, ...delegateMsgs];
  };

  const buildSplitRewardsMsg = (
    params: SplitRewardsParams,
  ): unknown[] => {
    // 1. Withdraw rewards from all validators involved in re-delegation
    const validatorAddresses = params.delegations.map(
      (delegation) => delegation.validatorAddress,
    );
    const withdrawMsgs = validatorAddresses.map(
      (validatorAddress) =>
        new MsgWithdrawDelegatorReward(senderAddress, validatorAddress),
    );

    // 2. Send exchangeAmount to the exchange address
    const sendMsg = new MsgSend(
      senderAddress,
      params.toAddress,
      new Coins([new Coin(stakingDenom, params.exchangeAmount)]),
    );

    // 3. Re-delegate the remaining amounts to validators
    const delegateMsgs = params.delegations.map(
      (delegation) =>
        new MsgDelegate(
          senderAddress,
          delegation.validatorAddress,
          new Coin(stakingDenom, delegation.amount),
        ),
    );

    return [...withdrawMsgs, sendMsg, ...delegateMsgs];
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

export { createXplaAdapter };
