import type { StakingAdapter } from '../adapter';
import { suiClient, readSuiPositions, readSuiValidators } from './client';

export function createSuiAdapter(): StakingAdapter {
  const unsupported = (): never => { throw new Error('Use the Sui staking page for this action.'); };
  return {
    getValidators: readSuiValidators,
    getDelegations: async (owner) => {
      const positions = await readSuiPositions(owner);
      if (positions.some((position) => position.rewards === null)) throw new Error('비활성 풀의 잔액은 Sui 전용 화면에서 확인하세요.');
      return positions.map((position) => ({ validatorAddress: position.validatorAddress, validatorName: position.validatorName, amount: position.principal.toString(), rewards: position.rewards!.toString() }));
    },
    getRewards: async (owner) => {
      const positions = await readSuiPositions(owner);
      if (positions.some((position) => position.rewards === null)) throw new Error('비활성 Sui 풀의 보상은 개별 출금 시 확인됩니다.');
      return { total: positions.reduce((sum, position) => sum + position.rewards!, BigInt(0)).toString(), perValidator: positions.map((position) => ({ validatorAddress: position.validatorAddress, amount: position.rewards!.toString() })) };
    },
    getUnbonding: async () => [],
    getBalance: async (owner) => (await suiClient.core.getBalance({ owner })).balance.balance,
    getTransactionHistory: unsupported, buildDelegateMsg: unsupported, buildUndelegateMsg: unsupported, buildRedelegateMsg: unsupported, buildWithdrawRewardsMsg: unsupported, buildSendMsg: unsupported, buildCompoundMsg: unsupported, buildSplitRewardsMsg: unsupported,
  };
}
