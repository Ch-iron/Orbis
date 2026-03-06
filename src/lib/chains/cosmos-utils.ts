// Shared utilities for Cosmos SDK chain adapters (XPLA, SEI, etc.)

import type { Validator, TxHistoryEntry } from './types';

// Cosmos SDK message @type -> TxHistoryEntry.type mapping
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

    // Amount format: "12345<denom>" — strip the denom suffix
    const numericStr = amountAttr.value.replace(stakingDenom, '');
    const parsed = BigInt(numericStr ?? '0');
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

export { MSG_TYPE_MAP, mapBondStatus, sumWithdrawRewardsFromEvents, extractAmount };
export type { TxEvent };
