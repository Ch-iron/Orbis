import { parseUnits } from 'viem';
import { aptosClient, aptosAddress, readAptosStake, readAptosValidators } from '@/lib/chains/aptos/client';
import type { InputTransactionData } from '@aptos-labs/wallet-adapter-react';

export type AptosAction = { kind: 'add_stake' | 'unlock' | 'reactivate_stake' | 'withdraw'; pool: string; amount: string };

export async function prepareAptosAction(owner: string, action: AptosAction): Promise<InputTransactionData> {
  aptosAddress(owner);
  const pool = aptosAddress(action.pool);
  if (!/^\d+(\.\d{1,8})?$/.test(action.amount)) throw new Error('Enter an amount with up to 8 decimal places.');
  const amount = parseUnits(action.amount, 8);
  if (amount <= BigInt(0) || amount > BigInt('18446744073709551615')) throw new Error('The amount is outside the allowed range.');
  if (action.kind === 'add_stake') {
    const validators = await readAptosValidators();
    if (!validators.some((item) => item.address === pool && item.status === 'active')) throw new Error('Select an active delegation pool.');
  } else {
    const stake = await readAptosStake(pool, owner);
    const available = action.kind === 'unlock' ? stake.active : action.kind === 'reactivate_stake' ? stake.pending : stake.inactive;
    if (amount > available) throw new Error('The amount exceeds the staked balance available in this state.');
  }
  const data: InputTransactionData = { data: { function: `0x1::delegation_pool::${action.kind}`, functionArguments: [pool, amount.toString()] } };
  const transaction = await aptosClient.transaction.build.simple({ sender: owner, data: data.data });
  const [simulation] = await aptosClient.transaction.simulate.simple({ transaction });
  if (!simulation?.success) throw new Error(simulation?.vm_status ?? 'Aptos transaction simulation failed.');
  return data;
}
