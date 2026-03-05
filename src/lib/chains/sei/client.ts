// Generic Cosmos LCD client using standard fetch() API

type ValidatorDescription = {
  moniker: string;
  details: string;
};

type ValidatorCommission = {
  commission_rates: {
    rate: string;
  };
};

type ValidatorEntry = {
  operator_address: string;
  description: ValidatorDescription;
  commission: ValidatorCommission;
  tokens: string;
  status: string;
  jailed: boolean;
};

type ValidatorsResponse = {
  validators: ValidatorEntry[];
  pagination: { next_key: string | null };
};

type DelegationEntry = {
  delegation: { validator_address: string };
  balance: { denom: string; amount: string };
};

type DelegationsResponse = {
  delegation_responses: DelegationEntry[];
};

type RewardEntry = {
  validator_address: string;
  reward: Array<{ denom: string; amount: string }> | null;
};

type RewardsResponse = {
  rewards: RewardEntry[];
  total: Array<{ denom: string; amount: string }>;
};

type UnbondingDelegationEntry = {
  validator_address: string;
  entries: Array<{
    balance: string;
    completion_time: string;
  }>;
};

type UnbondingResponse = {
  unbonding_responses: UnbondingDelegationEntry[];
};

type ValidatorResponse = {
  validator: ValidatorEntry;
};

type TxEvent = {
  type: string;
  attributes: Array<{ key: string; value: string }>;
};

type TxResponse = {
  txhash: string;
  height: string;
  timestamp: string;
  code: number;
  data: string;
  events: TxEvent[];
  tx: {
    body: {
      messages: Array<Record<string, unknown>>;
      memo: string;
    };
  };
};

type TxHistoryRawResponse = {
  tx_responses: TxResponse[] | null;
  total: string;
};

type CosmosLcdClient = {
  getValidators: (paginationKey?: string) => Promise<ValidatorsResponse>;
  getDelegations: (delegatorAddress: string) => Promise<DelegationsResponse>;
  getRewards: (delegatorAddress: string) => Promise<RewardsResponse>;
  getBalance: (address: string, denom: string) => Promise<string>;
  getUnbondingDelegations: (delegatorAddress: string) => Promise<UnbondingResponse>;
  getValidator: (validatorAddress: string) => Promise<ValidatorResponse | null>;
  getTxHistory: (address: string, limit: number, page: number) => Promise<TxHistoryRawResponse>;
};

const EMPTY_VALIDATORS_RESPONSE: ValidatorsResponse = {
  validators: [],
  pagination: { next_key: null },
};

const EMPTY_DELEGATIONS_RESPONSE: DelegationsResponse = {
  delegation_responses: [],
};

const EMPTY_REWARDS_RESPONSE: RewardsResponse = {
  rewards: [],
  total: [],
};

const EMPTY_UNBONDING_RESPONSE: UnbondingResponse = {
  unbonding_responses: [],
};

const EMPTY_TX_HISTORY_RESPONSE: TxHistoryRawResponse = {
  tx_responses: null,
  total: '0',
};

const clientMap = new Map<string, CosmosLcdClient>();

const createCosmosLcdClient = (lcdUrl: string): CosmosLcdClient => {
  const existingClient = clientMap.get(lcdUrl);

  if (existingClient) {
    return existingClient;
  }

  const getValidators = async (paginationKey?: string): Promise<ValidatorsResponse> => {
    const params = new URLSearchParams();

    if (paginationKey) {
      params.set('pagination.key', paginationKey);
    }

    const queryString = params.toString();
    const url = `${lcdUrl}/cosmos/staking/v1beta1/validators${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url).catch((fetchError) => {
      console.error('cosmos lcd getValidators error', fetchError);
      return null;
    });

    if (!response?.ok) {
      return EMPTY_VALIDATORS_RESPONSE;
    }

    const data = await response.json().catch((parseError) => {
      console.error('cosmos lcd getValidators parse error', parseError);
      return null;
    });

    if (!data) {
      return EMPTY_VALIDATORS_RESPONSE;
    }

    return data as ValidatorsResponse;
  };

  const getDelegations = async (delegatorAddress: string): Promise<DelegationsResponse> => {
    const response = await fetch(
      `${lcdUrl}/cosmos/staking/v1beta1/delegations/${delegatorAddress}`,
    ).catch((fetchError) => {
      console.error('cosmos lcd getDelegations error', fetchError);
      return null;
    });

    if (!response?.ok) {
      return EMPTY_DELEGATIONS_RESPONSE;
    }

    const data = await response.json().catch((parseError) => {
      console.error('cosmos lcd getDelegations parse error', parseError);
      return null;
    });

    if (!data) {
      return EMPTY_DELEGATIONS_RESPONSE;
    }

    return data as DelegationsResponse;
  };

  const getRewards = async (delegatorAddress: string): Promise<RewardsResponse> => {
    const response = await fetch(
      `${lcdUrl}/cosmos/distribution/v1beta1/delegators/${delegatorAddress}/rewards`,
    ).catch((fetchError) => {
      console.error('cosmos lcd getRewards error', fetchError);
      return null;
    });

    if (!response?.ok) {
      return EMPTY_REWARDS_RESPONSE;
    }

    const data = await response.json().catch((parseError) => {
      console.error('cosmos lcd getRewards parse error', parseError);
      return null;
    });

    if (!data) {
      return EMPTY_REWARDS_RESPONSE;
    }

    return data as RewardsResponse;
  };

  const getBalance = async (address: string, denom: string): Promise<string> => {
    const response = await fetch(
      `${lcdUrl}/cosmos/bank/v1beta1/balances/${address}/by_denom?denom=${denom}`,
    ).catch((fetchError) => {
      console.error('cosmos lcd getBalance error', fetchError);
      return null;
    });

    if (!response?.ok) {
      return '0';
    }

    const data = await response.json().catch((parseError) => {
      console.error('cosmos lcd getBalance parse error', parseError);
      return null;
    });

    if (!data) {
      return '0';
    }

    const balance = data as { balance?: { amount?: string } };
    return balance.balance?.amount ?? '0';
  };

  const getUnbondingDelegations = async (delegatorAddress: string): Promise<UnbondingResponse> => {
    const response = await fetch(
      `${lcdUrl}/cosmos/staking/v1beta1/delegators/${delegatorAddress}/unbonding_delegations`,
    ).catch((fetchError) => {
      console.error('cosmos lcd getUnbondingDelegations error', fetchError);
      return null;
    });

    if (!response?.ok) {
      return EMPTY_UNBONDING_RESPONSE;
    }

    const data = await response.json().catch((parseError) => {
      console.error('cosmos lcd getUnbondingDelegations parse error', parseError);
      return null;
    });

    if (!data) {
      return EMPTY_UNBONDING_RESPONSE;
    }

    return data as UnbondingResponse;
  };

  const getValidator = async (validatorAddress: string): Promise<ValidatorResponse | null> => {
    const response = await fetch(
      `${lcdUrl}/cosmos/staking/v1beta1/validators/${validatorAddress}`,
    ).catch((fetchError) => {
      console.error('cosmos lcd getValidator error', fetchError);
      return null;
    });

    if (!response?.ok) {
      return null;
    }

    const data = await response.json().catch((parseError) => {
      console.error('cosmos lcd getValidator parse error', parseError);
      return null;
    });

    if (!data) {
      return null;
    }

    return data as ValidatorResponse;
  };

  const getTxHistory = async (
    address: string,
    limit: number,
    page: number,
  ): Promise<TxHistoryRawResponse> => {
    const params = new URLSearchParams({
      events: `message.sender='${address}'`,
      order_by: 'ORDER_BY_DESC',
      limit: String(limit),
      page: String(page),
    });

    const response = await fetch(
      `${lcdUrl}/cosmos/tx/v1beta1/txs?${params.toString()}`,
    ).catch((fetchError) => {
      console.error('cosmos lcd getTxHistory error', fetchError);
      return null;
    });

    if (!response?.ok) {
      return EMPTY_TX_HISTORY_RESPONSE;
    }

    const data = await response.json().catch((parseError) => {
      console.error('cosmos lcd getTxHistory parse error', parseError);
      return null;
    });

    if (!data) {
      return EMPTY_TX_HISTORY_RESPONSE;
    }

    return data as TxHistoryRawResponse;
  };

  const client: CosmosLcdClient = {
    getValidators,
    getDelegations,
    getRewards,
    getBalance,
    getUnbondingDelegations,
    getValidator,
    getTxHistory,
  };

  clientMap.set(lcdUrl, client);

  return client;
};

export { createCosmosLcdClient };
export type { CosmosLcdClient, TxHistoryRawResponse };
