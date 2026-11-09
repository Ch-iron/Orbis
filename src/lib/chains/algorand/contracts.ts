import { AlgorandClient } from '@algorandfoundation/algokit-utils';
import { AppClient } from '@algorandfoundation/algokit-utils/types/app-client';
import type { TransactionSigner } from 'algosdk';
import registrySpec from './ValidatorRegistry.json';
import poolSpec from './StakingPool.json';

export const RETI_APP_ID = BigInt(2714516089);
export const ALGORAND_RPC = 'https://mainnet-api.4160.nodely.dev';
const READ_SENDER = 'A7NMWS3NT3IUDMLVO26ULGXGIIOUQ3ND2TXSER6EBGRZNOBOUIQXHIBGDE';

export function createRetiClients(sender = READ_SENDER, signer?: TransactionSigner) {
  const algorand = AlgorandClient.fromConfig({ algodConfig: { server: ALGORAND_RPC, port: '', token: '' } });
  if (signer) algorand.setSigner(sender, signer);
  const registry = new AppClient({ algorand, appId: RETI_APP_ID, appSpec: JSON.stringify(registrySpec), defaultSender: sender, defaultSigner: signer });
  const pool = (appId: bigint) => new AppClient({ algorand, appId, appSpec: JSON.stringify(poolSpec), defaultSender: sender, defaultSigner: signer });
  return { algorand, registry, pool };
}
