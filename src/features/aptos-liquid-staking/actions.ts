import { parseUnits } from 'viem';
import type { InputTransactionData } from '@aptos-labs/wallet-adapter-react';
import { aptosClient, aptosAddress } from '@/lib/chains/aptos/client';
import { AMNIS, readAmnisPosition } from './client';

export type AmnisAction = { kind: 'stake' | 'unstake' | 'redeem'; amount: string } | { kind: 'claim'; ticket: string };

export async function prepareAmnisAction(owner: string, action: AmnisAction): Promise<InputTransactionData> {
  const address = aptosAddress(owner);
  const position = await readAmnisPosition(address);
  let data: InputTransactionData;
  if (action.kind === 'claim') {
    const ticket = position.tickets.find((item) => item.address === action.ticket);
    if (!ticket || ticket.unlock > position.timestamp) throw new Error('This Amnis withdrawal is not owned or not yet unlocked.');
    data = { data: { function: `${AMNIS}::router::withdraw_entry`, functionArguments: [ticket.address] } };
  } else {
    if (!/^\d+(\.\d{1,8})?$/.test(action.amount)) throw new Error('Enter an amount with up to 8 decimal places.');
    const amount = parseUnits(action.amount, 8);
    if (amount <= BigInt(0) || amount >= BigInt(2) ** BigInt(64)) throw new Error('Enter a positive amount within the Aptos transaction limit.');
    const balance = action.kind === 'stake' ? position.available : action.kind === 'unstake' ? position.receipt : position.amapt;
    if (amount > balance || (action.kind === 'stake' && amount === balance)) throw new Error('Insufficient token balance including APT gas.');
    const method = action.kind === 'stake' ? 'deposit_and_stake_entry' : action.kind === 'unstake' ? 'unstake_entry' : 'request_withdrawal_entry';
    data = { data: { function: `${AMNIS}::router::${method}`, functionArguments: [amount.toString(), address] } };
  }
  const transaction = await aptosClient.transaction.build.simple({ sender: address, data: data.data });
  const [simulation] = await aptosClient.transaction.simulate.simple({ transaction });
  if (!simulation?.success) throw new Error(simulation?.vm_status ?? 'Amnis transaction simulation failed.');
  return data;
}
