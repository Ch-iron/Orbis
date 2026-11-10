import { MeshTxBuilder, deserializePoolId, type UTxO } from '@meshsdk/core';
import { cardanoProvider, readCardanoAccount, readCardanoPool, readCardanoCostModels } from '@/lib/chains/cardano/client';
export type CardanoAction = { kind: 'delegate'; pool: string } | { kind: 'claim' | 'deregister'; allowAbstain: boolean };
export async function prepareCardanoAction(stakeAddress: string, changeAddress: string, utxos: UTxO[], action: CardanoAction) {
  if (!stakeAddress.startsWith('stake1') || !changeAddress.startsWith('addr1')) throw new Error('A Cardano mainnet address is required.');
  if (!utxos.length) throw new Error('A wallet balance is required to pay transaction fees.');
  const [account, parameters, costModels] = await Promise.all([readCardanoAccount(stakeAddress), cardanoProvider.fetchProtocolParameters(), readCardanoCostModels()]);
  const builder = new MeshTxBuilder({ fetcher: cardanoProvider, params: parameters }).setCostModels(costModels);
  if (action.kind === 'delegate') {
    const pool = await readCardanoPool(action.pool);
    if (pool.pool_status !== 'registered' || pool.retiring_epoch !== null) throw new Error('Select an active pool that is not scheduled to retire.');
    if (account?.status !== 'registered') builder.registerStakeCertificate(stakeAddress);
    builder.delegateStakeCertificate(stakeAddress, deserializePoolId(action.pool));
  } else {
    if (account?.status !== 'registered') throw new Error('No registered stake account found.');
    const rewards = BigInt(account.rewards_available);
    if (action.kind === 'claim' && rewards === BigInt(0)) throw new Error('No rewards to claim.');
    if (rewards > BigInt(0)) {
      if (!account.delegated_drep) {
        if (!action.allowAbstain) throw new Error('Claiming rewards requires governance delegation. Choose a representative in your wallet or agree to Always Abstain.');
        builder.voteDelegationCertificate({ alwaysAbstain: null }, stakeAddress);
      }
      builder.withdrawal(stakeAddress, rewards.toString());
    }
    if (action.kind === 'deregister') builder.deregisterStakeCertificate(stakeAddress);
  }
  return builder.selectUtxosFrom(utxos).changeAddress(changeAddress).complete();
}
