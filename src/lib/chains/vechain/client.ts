import { getAddress, zeroAddress, type Address } from 'viem';
import { vechainReadClient as client, thorRead } from './transport';
import { STARGATE, STARGATE_NFT, PROTOCOL_STAKER, STARGATE_ABI, NFT_ABI, STAKER_ABI } from './contracts';
export const readVechainBlock = () => thorRead<{ number: number; id: string; timestamp: number }>('/blocks/best');
export async function readVechainBalance(owner: Address) {
  const account = await thorRead<{ balance: string; energy: string }>(`/accounts/${getAddress(owner)}`);
  return { vet: BigInt(account.balance), vtho: BigInt(account.energy) };
}
export async function readVechainLevels() {
  const levels = await client.readContract({ address: STARGATE_NFT, abi: NFT_ABI, functionName: 'getLevels' });
  return Promise.all(levels.filter((level) => !level.isX).map(async (level) => {
    const [supply, cap] = await client.readContract({ address: STARGATE_NFT, abi: NFT_ABI, functionName: 'getLevelSupply', args: [level.id] });
    return { ...level, supply, cap };
  }));
}
export async function readVechainValidator(address: Address) {
  const [validation, period] = await Promise.all([
    client.readContract({ address: PROTOCOL_STAKER, abi: STAKER_ABI, functionName: 'getValidation', args: [address] }),
    client.readContract({ address: PROTOCOL_STAKER, abi: STAKER_ABI, functionName: 'getValidationPeriodDetails', args: [address] }),
  ]);
  return { address, endorser: validation[0], stake: validation[1], status: validation[4], period: period[0], startBlock: period[1], exitBlock: period[2], completedPeriods: period[3] };
}
export async function readVechainValidators() {
  const addresses: Address[] = [];
  const seen = new Set<string>();
  for (const functionName of ['firstActive', 'firstQueued'] as const) {
    let address = await client.readContract({ address: PROTOCOL_STAKER, abi: STAKER_ABI, functionName });
    while (address !== zeroAddress) {
      if (seen.has(address.toLowerCase())) throw new Error('The VeChain validator list contains a circular reference.');
      seen.add(address.toLowerCase()); addresses.push(address);
      address = await client.readContract({ address: PROTOCOL_STAKER, abi: STAKER_ABI, functionName: 'next', args: [address] });
    }
  }
  return Promise.all(addresses.map(readVechainValidator));
}
export async function readVechainPosition(id: bigint) {
  const [token, owner, maturity, delegation, rewards, lockedRewards, requestedExit] = await Promise.all([
    client.readContract({ address: STARGATE_NFT, abi: NFT_ABI, functionName: 'getToken', args: [id] }),
    client.readContract({ address: STARGATE_NFT, abi: NFT_ABI, functionName: 'ownerOf', args: [id] }),
    client.readContract({ address: STARGATE_NFT, abi: NFT_ABI, functionName: 'maturityPeriodEndBlock', args: [id] }),
    client.readContract({ address: STARGATE, abi: STARGATE_ABI, functionName: 'getDelegationDetails', args: [id] }),
    client.readContract({ address: STARGATE, abi: STARGATE_ABI, functionName: 'claimableRewards', args: [id] }),
    client.readContract({ address: STARGATE, abi: STARGATE_ABI, functionName: 'lockedRewards', args: [id] }),
    client.readContract({ address: STARGATE, abi: STARGATE_ABI, functionName: 'hasRequestedExit', args: [id] }),
  ]);
  return { ...token, owner, maturity, delegation, rewards, lockedRewards, requestedExit };
}
export async function readVechainPositions(owner: Address) {
  const tokens = await client.readContract({ address: STARGATE_NFT, abi: NFT_ABI, functionName: 'tokensOwnedBy', args: [owner] });
  return Promise.all(tokens.map((token) => readVechainPosition(token.tokenId)));
}
export async function readVechainReceipt(hash: string) {
  const receipt = await thorRead<{ reverted: boolean } | null>(`/transactions/${hash}/receipt`);
  return receipt === null ? 'pending' : receipt.reverted ? 'failed' : 'success';
}
