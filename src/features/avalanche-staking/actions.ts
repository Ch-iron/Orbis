import { pvm, utils } from '@avalabs/avalanchejs';
import { parseUnits } from 'viem';
import { avalancheP, readAvalancheBalance, readAvalancheContext, readAvalancheUtxos, readAvalancheCapacity, PRIMARY_NETWORK, validatePAddress } from '@/lib/chains/avalanche/client';
export type AvalancheAction = { nodeID: string; amount: string; endTime: number };
export async function prepareAvalancheAction(owner: string, action: AvalancheAction) {
  validatePAddress(owner);
  if (!/^\d+(\.\d{1,9})?$/.test(action.amount)) throw new Error('Enter an AVAX amount with up to 9 decimal places.');
  const amount = parseUnits(action.amount, 9);
  if (amount <= BigInt(0)) throw new Error('The stake amount must be greater than zero.');
  const [minimum, clock, { validators }, balance] = await Promise.all([
    avalancheP.getMinStake(), avalancheP.getTimestamp(), avalancheP.getCurrentValidators({ nodeIDs: [action.nodeID], subnetID: PRIMARY_NETWORK }), readAvalancheBalance(owner),
  ]);
  if (amount < minimum.minDelegatorStake) throw new Error('The amount is below the mainnet minimum delegation.');
  const now = Math.floor(new Date(clock.timestamp).getTime() / 1000);
  if (!Number.isSafeInteger(now) || !Number.isSafeInteger(action.endTime)) throw new Error('Invalid delegation end time.');
  const start = BigInt(now + 60);
  const end = BigInt(action.endTime);
  // Helicon shortens validation periods; fixed-term delegations still require 14 days.
  if (end - start < BigInt(14 * 86400) || end - start > BigInt(365 * 86400)) throw new Error('The delegation period must be 14–365 days.');
  const validator = validators.find((item) => item.nodeID === action.nodeID);
  if (!validator || start < BigInt(validator.startTime) || end > BigInt(validator.endTime)) throw new Error('The delegation period must fit within the current validator validation period.');
  if (balance.unlocked <= amount) throw new Error('Insufficient unlocked P-Chain balance for the stake and transaction fee.');
  const weight = BigInt(validator.weight);
  const maximum = weight * BigInt(5) < BigInt(3000000) * BigInt(10) ** BigInt(9) ? weight * BigInt(5) : BigInt(3000000) * BigInt(10) ** BigInt(9);
  if (await readAvalancheCapacity(action.nodeID) + amount > maximum) throw new Error('The amount exceeds validator delegation capacity for this period.');
  const [context, utxos, feeState] = await Promise.all([readAvalancheContext(), readAvalancheUtxos(owner), avalancheP.getFeeState()]);
  const address = utils.bech32ToBytes(owner);
  const transaction = pvm.newAddPermissionlessDelegatorTx({ fromAddressesBytes: [address], changeAddressesBytes: [address], utxos, feeState, nodeId: action.nodeID, subnetId: PRIMARY_NETWORK, start, end, weight: amount, rewardAddresses: [address] }, context);
  return { transaction, start, end, amount };
}
