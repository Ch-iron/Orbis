import { Algodv2 } from 'algosdk';
import { ALGORAND_RPC } from '@/lib/chains/algorand/contracts';
import { readAlgorandAccount } from '@/lib/chains/algorand/client';
import { getConsensusState, MainnetConsensusConfig } from './sdk';

export const xAlgoClient = new Algodv2('', ALGORAND_RPC, '');

export async function readXAlgoPosition(owner: string) {
  const [account, state] = await Promise.all([readAlgorandAccount(owner), getConsensusState(xAlgoClient, MainnetConsensusConfig)]);
  const asset = account.assets.find((item) => item.assetId === BigInt(MainnetConsensusConfig.xAlgoId));
  if (state.algoBalance <= BigInt(0) || state.xAlgoCirculatingSupply <= BigInt(0)) throw new Error('xALGO exchange rate is unavailable.');
  return { available: account.amount - account.minimumBalance, receipt: asset?.amount ?? BigInt(0), optedIn: !!asset, state };
}
