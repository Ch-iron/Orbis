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
  TxHistoryEntry,
  TxHistoryResponse,
} from '../types';

// Cosmos SDK message @type → TxHistoryEntry.type mapping
const MSG_TYPE_MAP: Record<string, TxHistoryEntry['type']> = {
  '/cosmos.staking.v1beta1.MsgDelegate': 'delegate',
  '/cosmos.staking.v1beta1.MsgUndelegate': 'undelegate',
  '/cosmos.staking.v1beta1.MsgBeginRedelegate': 'redelegate',
  '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward': 'withdraw_rewards',
  '/cosmos.bank.v1beta1.MsgSend': 'send',
};

type TxEvent = {
  type: string;
  attributes: Array<{ key: string; value: string }>;
};

// Sum withdraw_rewards amounts from tx events
const sumWithdrawRewardsFromEvents = (
  events: TxEvent[],
  stakingDenom: string,
): string | null => {
  const withdrawEvents = events.filter(
    (event) => event.type === 'withdraw_rewards',
  );

  if (withdrawEvents.length === 0) {
    return null;
  }

  const total = withdrawEvents.reduce((sum, event) => {
    const amountAttr = event.attributes.find(
      (attr) => attr.key === 'amount',
    );

    if (!amountAttr?.value) {
      return sum;
    }

    // Amount format: "12345axpla" — strip the denom suffix
    const numericStr = amountAttr.value.replace(stakingDenom, '');
    const parsed = BigInt(numericStr || '0');
    return sum + parsed;
  }, BigInt(0));

  return total.toString();
};

// Extract the amount from a tx message based on its type
const extractAmount = (
  message: Record<string, unknown>,
  txType: TxHistoryEntry['type'],
  events: TxEvent[],
  stakingDenom: string,
): string | null => {
  if (txType === 'delegate' || txType === 'undelegate' || txType === 'redelegate') {
    const amount = message.amount as { amount?: string } | undefined;
    return amount?.amount ?? null;
  }

  if (txType === 'send') {
    const amounts = message.amount as Array<{ amount?: string }> | undefined;
    return amounts?.[0]?.amount ?? null;
  }

  if (txType === 'withdraw_rewards') {
    return sumWithdrawRewardsFromEvents(events, stakingDenom);
  }

  return null;
};

// Map BondStatus to our Validator status type
// LCD returns status as a string (e.g. "BOND_STATUS_BONDED"),
// while proto enum uses numeric values — handle both.
const mapBondStatus = (
  status: number | string,
): Validator['status'] => {
  const statusStr = String(status);

  if (statusStr === '3' || statusStr === 'BOND_STATUS_BONDED') {
    return 'active';
  }

  if (statusStr === '2' || statusStr === 'BOND_STATUS_UNBONDING') {
    return 'inactive';
  }

  if (statusStr === '1' || statusStr === 'BOND_STATUS_UNBONDED') {
    return 'inactive';
  }

  return 'jailed';
};

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
    const params = new URLSearchParams({
      query: `message.sender='${address}'`,
      order_by: 'ORDER_BY_DESC',
      limit: String(limit),
      page: String(page),
    });

    const response = await fetch(
      `${config.lcd}/cosmos/tx/v1beta1/txs?${params.toString()}`,
    ).catch(() => null);

    if (!response?.ok) {
      return { entries: [], total: 0 };
    }

    const data = await response.json().catch(() => null);

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
