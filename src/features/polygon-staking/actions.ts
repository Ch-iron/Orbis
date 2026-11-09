import { encodeFunctionData, erc20Abi, type Address } from 'viem';
import { parseStakeAmount } from '@/features/ethereum-staking/amount';
import { polygonStakingClient, readPolygonBalance, readPolygonPosition, readPolygonValidator, readPolygonWithdrawal } from '@/lib/chains/polygon/client';
import { POL, SHARE_ABI, STAKE_MANAGER } from '@/lib/chains/polygon/contracts';
export type PolygonAction = { kind: 'stake' | 'unstake'; id: bigint; amount: string } | { kind: 'claim'; id: bigint } | { kind: 'compound'; id: bigint } | { kind: 'withdraw'; id: bigint; nonce: bigint };
export async function preparePolygonAction(owner: Address, action: PolygonAction) {
  const validator = await readPolygonValidator(action.id);
  const tx = (functionName: 'buyVoucherPOL' | 'sellVoucher_newPOL' | 'unstakeClaimTokens_newPOL' | 'withdrawRewardsPOL' | 'restakePOL', args: [] | [bigint] | [bigint, bigint] = []) => ({ to: validator.contract, value: BigInt(0), data: encodeFunctionData({ abi: SHARE_ABI, functionName, args }) });
  if (action.kind === 'withdraw') {
    const withdrawal = await readPolygonWithdrawal(owner, action.id, action.nonce);
    if (!withdrawal.ready) throw new Error('출금 가능 체크포인트에 도달하지 않았거나 이미 출금한 요청입니다.');
    return [tx('unstakeClaimTokens_newPOL', [action.nonce])];
  }
  const position = await readPolygonPosition(action.id, owner);
  if (action.kind === 'claim' || action.kind === 'compound') {
    if (position.rewards <= BigInt(0)) throw new Error('수령 가능한 보상이 없습니다.');
    return [tx(action.kind === 'claim' ? 'withdrawRewardsPOL' : 'restakePOL')];
  }
  const amount = parseStakeAmount(action.amount);
  const precision = action.id < BigInt(8) ? BigInt(100) : BigInt(10) ** BigInt(29);
  if (position.rate <= BigInt(0)) throw new Error('위임 지분 환산율을 확인할 수 없습니다.');
  const shares = amount * precision / position.rate;
  if (shares <= BigInt(0)) throw new Error('위임 지분을 생성하기에 수량이 너무 작습니다.');
  if (action.kind === 'unstake') {
    if (amount > position.amount) throw new Error('예치 잔액을 초과했습니다.');
    return [tx('sellVoucher_newPOL', [amount, shares])];
  }
  if (!validator.active || !validator.delegation) throw new Error('현재 위임 가능한 검증자가 아닙니다.');
  if (amount > await readPolygonBalance(owner)) throw new Error('Ethereum 네트워크의 POL 잔액이 부족합니다.');
  const allowance = await polygonStakingClient.readContract({ address: POL, abi: erc20Abi, functionName: 'allowance', args: [owner, STAKE_MANAGER] });
  return [
    ...(allowance < amount ? [{ to: POL as Address, value: BigInt(0), data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [STAKE_MANAGER, amount] }) }] : []),
    tx('buyVoucherPOL', [amount, shares]),
  ];
}
