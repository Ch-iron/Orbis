import { bech32 } from 'bech32';
import { parseUnits } from 'viem';
import type { EncodeObject } from '@cosmjs/proto-signing';
import type { ChainConfig } from '@/lib/chains/types';

export type NativeCosmosAction =
  | { type: 'delegate' | 'undelegate'; validator: string; amount: string }
  | { type: 'redelegate'; validator: string; destination: string; amount: string }
  | { type: 'claim'; validators: string[] };

export function buildNativeCosmosMessages(config: ChainConfig, sender: string, action: NativeCosmosAction): EncodeObject[] {
  validateAddress(sender, config.bech32Prefix!);
  if (action.type === 'claim') {
    const validators = [...new Set(action.validators)];
    if (!validators.length) throw new Error('No validators to claim from.');
    return validators.map((validatorAddress) => {
      validateAddress(validatorAddress, `${config.bech32Prefix}valoper`);
      return { typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward', value: { delegatorAddress: sender, validatorAddress } };
    });
  }
  validateAddress(action.validator, `${config.bech32Prefix}valoper`);
  const { decimals, denom } = config.stakingToken;
  if (!new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`).test(action.amount)) throw new Error('Enter an amount within the token decimal precision.');
  const raw = parseUnits(action.amount, decimals);
  if (raw <= BigInt(0)) throw new Error('Amount must be greater than zero.');
  const amount = { denom, amount: raw.toString() };
  if (action.type === 'redelegate') {
    validateAddress(action.destination, `${config.bech32Prefix}valoper`);
    if (action.validator === action.destination) throw new Error('Choose a different destination validator.');
    return [{ typeUrl: '/cosmos.staking.v1beta1.MsgBeginRedelegate', value: { delegatorAddress: sender, validatorSrcAddress: action.validator, validatorDstAddress: action.destination, amount } }];
  }
  return [{ typeUrl: action.type === 'delegate' ? '/cosmos.staking.v1beta1.MsgDelegate' : '/cosmos.staking.v1beta1.MsgUndelegate', value: { delegatorAddress: sender, validatorAddress: action.validator, amount } }];
}

function validateAddress(address: string, prefix: string) {
  const decoded = bech32.decode(address);
  if (decoded.prefix !== prefix || bech32.fromWords(decoded.words).length !== 20) throw new Error('Address belongs to a different chain or account type.');
}
