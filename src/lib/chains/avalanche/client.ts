import { pvm, Context, utils } from '@avalabs/avalanchejs';
export const AVAX_RPC = 'https://api.avax.network';
export const PRIMARY_NETWORK = '11111111111111111111111111111111LpoYY';
export const avalancheP = new pvm.PVMApi(AVAX_RPC);
export const readAvalancheContext = () => Context.getContextFromURI(AVAX_RPC);
export function validatePAddress(address: string) {
  if (!address.startsWith('P-avax1') || utils.bech32ToBytes(address).length !== 20) throw new Error('An Avalanche mainnet P-Chain address is required.');
  return address;
}
export const readAvalancheValidators = async () => (await avalancheP.getCurrentValidators({ subnetID: PRIMARY_NETWORK })).validators;
export async function readAvalancheBalance(address: string) { return avalancheP.getBalance({ addresses: [validatePAddress(address)] }); }
export async function readAvalancheUtxos(address: string) {
  validatePAddress(address);
  const utxos: Awaited<ReturnType<typeof avalancheP.getUTXOs>>['utxos'] = [];
  let startIndex: { address: string; utxo: string } | undefined;
  for (;;) {
    const page = await avalancheP.getUTXOs({ addresses: [address], limit: 1024, startIndex });
    utxos.push(...page.utxos);
    if (page.utxos.length < 1024) return utxos;
    if (startIndex?.utxo === page.endIndex.utxo) throw new Error('Avalanche UTXO pagination is not advancing.');
    startIndex = page.endIndex;
  }
}
export async function readAvalancheCapacity(nodeID: string) {
  // Since Durango, new stakes start immediately and there are no pending delegators.
  const { validators } = await avalancheP.getCurrentValidators({ subnetID: PRIMARY_NETWORK, nodeIDs: [nodeID] });
  const validator = validators.find((item) => item.nodeID === nodeID);
  if (!validator) throw new Error('This validator is not currently active.');
  return BigInt(validator.weight) + (validator.delegators ?? []).reduce((sum, item) => {
    // AvalancheJS still types the retired stakeAmount field; current RPC returns weight.
    if (!('weight' in item) || typeof item.weight !== 'string') throw new Error('Invalid delegation amount response.');
    return sum + BigInt(item.weight);
  }, BigInt(0));
}
export type AvalanchePosition = { txHash: string; txType: string; nodeId: string; startTimestamp: number; endTimestamp: number; estimatedReward: string; amountStaked: Array<{ amount: string; symbol: string }>; autoRenew?: { compoundedWeight: string } };
export async function readAvalanchePositions(address: string) {
  validatePAddress(address);
  const positions: AvalanchePosition[] = [];
  let pageToken: string | undefined;
  const seen = new Set<string>();
  do {
    const query = new URLSearchParams({ addresses: address, pageSize: '100', ...(pageToken ? { pageToken } : {}) });
    const response = await fetch(`https://data-api.avax.network/v1/networks/mainnet/blockchains/p-chain/transactions:listStaking?${query}`);
    if (!response.ok) throw new Error(`Avalanche staking request failed (${response.status})`);
    const data: { transactions: AvalanchePosition[]; nextPageToken?: string } = await response.json();
    if (!Array.isArray(data.transactions)) throw new Error('Invalid Avalanche staking response.');
    positions.push(...data.transactions);
    pageToken = data.nextPageToken;
    if (pageToken && seen.has(pageToken)) throw new Error('Avalanche staking pagination is not advancing.');
    if (pageToken) seen.add(pageToken);
  } while (pageToken);
  return positions;
}
export async function readAvalancheReceipt(txID: string) {
  const { status, reason } = await avalancheP.getTxStatus({ txID, includeReason: true });
  if (status === 'Dropped' || status === 'Aborted') throw new Error(`Avalanche transaction failed: ${reason}`);
  return status === 'Committed' ? 'success' : 'pending';
}
