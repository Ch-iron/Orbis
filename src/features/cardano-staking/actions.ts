import { MeshTxBuilder, deserializePoolId, type UTxO } from '@meshsdk/core';
import { cardanoProvider, readCardanoAccount, readCardanoPool, readCardanoCostModels } from '@/lib/chains/cardano/client';
export type CardanoAction = { kind: 'delegate'; pool: string } | { kind: 'claim' | 'deregister'; allowAbstain: boolean };
export async function prepareCardanoAction(stakeAddress: string, changeAddress: string, utxos: UTxO[], action: CardanoAction) {
  if (!stakeAddress.startsWith('stake1') || !changeAddress.startsWith('addr1')) throw new Error('Cardano 메인넷 주소가 필요합니다.');
  if (!utxos.length) throw new Error('거래 수수료를 지불할 지갑 잔액이 필요합니다.');
  const [account, parameters, costModels] = await Promise.all([readCardanoAccount(stakeAddress), cardanoProvider.fetchProtocolParameters(), readCardanoCostModels()]);
  const builder = new MeshTxBuilder({ fetcher: cardanoProvider, params: parameters }).setCostModels(costModels);
  if (action.kind === 'delegate') {
    const pool = await readCardanoPool(action.pool);
    if (pool.pool_status !== 'registered' || pool.retiring_epoch !== null) throw new Error('종료 예정이 아닌 활성 풀을 선택하세요.');
    if (account?.status !== 'registered') builder.registerStakeCertificate(stakeAddress);
    builder.delegateStakeCertificate(stakeAddress, deserializePoolId(action.pool));
  } else {
    if (account?.status !== 'registered') throw new Error('등록된 스테이크 계정이 없습니다.');
    const rewards = BigInt(account.rewards_available);
    if (action.kind === 'claim' && rewards === BigInt(0)) throw new Error('수령할 보상이 없습니다.');
    if (rewards > BigInt(0)) {
      if (!account.delegated_drep) {
        if (!action.allowAbstain) throw new Error('보상 수령에는 거버넌스 위임이 필요합니다. 지갑에서 대표를 선택하거나 항상 기권에 동의하세요.');
        builder.voteDelegationCertificate({ alwaysAbstain: null }, stakeAddress);
      }
      builder.withdrawal(stakeAddress, rewards.toString());
    }
    if (action.kind === 'deregister') builder.deregisterStakeCertificate(stakeAddress);
  }
  return builder.selectUtxosFrom(utxos).changeAddress(changeAddress).complete();
}
