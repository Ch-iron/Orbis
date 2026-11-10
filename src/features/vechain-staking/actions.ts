import { encodeFunctionData, type Address } from 'viem';
import { readVechainBalance, readVechainLevels, readVechainPosition, readVechainValidator, readVechainBlock } from '@/lib/chains/vechain/client';
import { STARGATE, STARGATE_ABI } from '@/lib/chains/vechain/contracts';
import { simulateVechainClauses, type VechainClause } from '@/lib/chains/vechain/transport';
export type VechainAction = { kind: 'stake'; levelId: number } | { kind: 'delegate'; tokenId: bigint; validator: Address } | { kind: 'exit' | 'unstake' | 'claim'; tokenId: bigint };
export async function prepareVechainAction(owner: Address, action: VechainAction) {
  const balance = await readVechainBalance(owner);
  if (balance.vtho === BigInt(0)) throw new Error('VTHO is required to pay transaction fees.');
  let clause: VechainClause;
  if (action.kind === 'stake') {
    const level = (await readVechainLevels()).find((item) => item.id === action.levelId);
    if (!level || level.isX || level.supply >= BigInt(level.cap)) throw new Error('Select a staking level available for minting.');
    if (balance.vet < level.vetAmountRequiredToStake) throw new Error('Insufficient VET balance to stake.');
    clause = { to: STARGATE, data: encodeFunctionData({ abi: STARGATE_ABI, functionName: 'stake', args: [level.id] }), value: level.vetAmountRequiredToStake.toString() };
  } else {
    const [position, block] = await Promise.all([readVechainPosition(action.tokenId), readVechainBlock()]);
    if (position.owner.toLowerCase() !== owner.toLowerCase()) throw new Error('This NFT does not belong to the connected account.');
    if (action.kind === 'delegate' || action.kind === 'unstake') {
      if (BigInt(block.number) < position.maturity) throw new Error('The NFT preparation period has not ended.');
      if (position.delegation.status === 2) throw new Error('End the active delegation before continuing.');
    }
    if (action.kind === 'delegate') {
      const validator = await readVechainValidator(action.validator);
      if (![1, 2].includes(validator.status) || validator.exitBlock !== 4294967295) throw new Error('Select a validator that accepts delegation.');
      clause = { to: STARGATE, data: encodeFunctionData({ abi: STARGATE_ABI, functionName: 'delegate', args: [action.tokenId, action.validator] }), value: '0' };
    } else {
      if (action.kind === 'exit' && (position.requestedExit || ![1, 2].includes(position.delegation.status))) throw new Error('There is no delegation to end, or an exit request is already pending.');
      if (action.kind === 'claim' && position.rewards === BigInt(0)) throw new Error('No VTHO rewards are available to claim.');
      const functionName = action.kind === 'exit' ? 'requestDelegationExit' : action.kind === 'claim' ? 'claimRewards' : 'unstake';
      clause = { to: STARGATE, data: encodeFunctionData({ abi: STARGATE_ABI, functionName, args: [action.tokenId] }), value: '0' };
    }
  }
  await simulateVechainClauses([clause], owner);
  return [clause];
}
