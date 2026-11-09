import type { ChainConfig, Validator, Delegation, UnbondingEntry } from '../types';
import { mapBondStatus } from '../cosmos-utils';

type Coin = { denom: string; amount: string };
type RawValidator = {
  operator_address: string; tokens: string; jailed: boolean; status: string;
  description: { moniker: string; details: string };
  commission: { commission_rates: { rate: string } };
};
type RawDelegation = { delegation: { validator_address: string }; balance: Coin };
type RawUnbonding = { validator_address: string; entries: { balance: string; completion_time: string }[] };

export function createNativeCosmosClient(config: ChainConfig) {
  async function getValidators(): Promise<Validator[]> {
    const validators = await paginate<RawValidator>('/cosmos/staking/v1beta1/validators', 'validators');
    return validators.map((validator) => ({
      address: validator.operator_address, name: validator.description.moniker, logo: null,
      commission: Number(validator.commission.commission_rates.rate), votingPower: validator.tokens,
      status: validator.jailed ? 'jailed' : mapBondStatus(validator.status), description: validator.description.details,
    }));
  }

  async function getDelegations(address: string): Promise<Delegation[]> {
    const entries = await paginate<RawDelegation>(`/cosmos/staking/v1beta1/delegations/${encodeURIComponent(address)}`, 'delegation_responses');
    const rewards = await getRewards(address);
    return entries.map((entry) => {
      if (entry.balance.denom !== config.stakingToken.denom) throw new Error('Unexpected staking denomination.');
      const reward = rewards.rewards.find((item) => item.validator_address === entry.delegation.validator_address);
      return {
        validatorAddress: entry.delegation.validator_address, validatorName: entry.delegation.validator_address,
        amount: integerAmount(entry.balance.amount),
        rewards: integerAmount(reward?.reward?.find((coin) => coin.denom === config.stakingToken.denom)?.amount ?? '0'),
      };
    });
  }

  async function getRewards(address: string) {
    const response = await get<{ rewards: { validator_address: string; reward: Coin[] | null }[]; total: Coin[] | null }>(`/cosmos/distribution/v1beta1/delegators/${encodeURIComponent(address)}/rewards`);
    if (!Array.isArray(response.rewards)) throw new Error('Invalid rewards response.');
    return { rewards: response.rewards, total: response.total ?? [] };
  }

  async function getUnbonding(address: string): Promise<UnbondingEntry[]> {
    const entries = await paginate<RawUnbonding>(`/cosmos/staking/v1beta1/delegators/${encodeURIComponent(address)}/unbonding_delegations`, 'unbonding_responses');
    return entries.flatMap((entry) => entry.entries.map((unbonding) => {
      const completionTime = new Date(unbonding.completion_time);
      if (!Number.isFinite(completionTime.getTime())) throw new Error('Invalid unbonding completion time.');
      return { validatorAddress: entry.validator_address, validatorName: entry.validator_address, amount: integerAmount(unbonding.balance), completionTime };
    }));
  }

  async function getBalance(address: string) {
    const query = new URLSearchParams({ denom: config.stakingToken.denom });
    const data = await get<{ balance: Coin }>(`/cosmos/bank/v1beta1/balances/${encodeURIComponent(address)}/by_denom?${query}`);
    return integerAmount(data.balance.amount);
  }

  async function getUnbondingSeconds() {
    const data = await get<{ params: { unbonding_time: string } }>('/cosmos/staking/v1beta1/params');
    if (!/^\d+(\.\d+)?s$/.test(data.params.unbonding_time)) throw new Error('Invalid unbonding duration.');
    return Number(data.params.unbonding_time.slice(0, -1));
  }

  async function paginate<T>(path: string, field: string) {
    const entries: T[] = [];
    const visited = new Set<string>();
    let nextKey = '';
    do {
      const query = new URLSearchParams({ 'pagination.limit': '200' });
      if (nextKey) query.set('pagination.key', nextKey);
      const data = await get<{ pagination?: { next_key: string | null }; [key: string]: unknown }>(`${path}?${query}`);
      if (!Array.isArray(data[field])) throw new Error(`Invalid ${field} response.`);
      entries.push(...data[field] as T[]);
      nextKey = data.pagination?.next_key ?? '';
      if (nextKey && visited.has(nextKey)) throw new Error('Repeated pagination key.');
      visited.add(nextKey);
    } while (nextKey);
    return entries;
  }

  async function get<T>(path: string): Promise<T> {
    const response = await fetch(`${config.lcd}${path}`);
    if (!response.ok) throw new Error(`${config.name} query failed (${response.status}).`);
    return response.json();
  }

  return { getValidators, getDelegations, getRewards, getUnbonding, getBalance, getUnbondingSeconds };
}

function integerAmount(amount: string) {
  if (!/^\d+(\.\d+)?$/.test(amount)) throw new Error('Invalid coin amount.');
  return amount.split('.')[0];
}
