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
    if (!withdrawal.ready) throw new Error('The withdrawal checkpoint has not been reached, or this request was already withdrawn.');
    return [tx('unstakeClaimTokens_newPOL', [action.nonce])];
  }
  const position = await readPolygonPosition(action.id, owner);
  if (action.kind === 'claim' || action.kind === 'compound') {
    if (position.rewards <= BigInt(0)) throw new Error('No rewards are available to claim.');
    return [tx(action.kind === 'claim' ? 'withdrawRewardsPOL' : 'restakePOL')];
  }
  const amount = parseStakeAmount(action.amount);
  const precision = action.id < BigInt(8) ? BigInt(100) : BigInt(10) ** BigInt(29);
  if (position.rate <= BigInt(0)) throw new Error('Could not verify the delegation share exchange rate.');
  const shares = amount * precision / position.rate;
  if (shares <= BigInt(0)) throw new Error('The amount is too small to create delegation shares.');
  if (action.kind === 'unstake') {
    if (amount > position.amount) throw new Error('The amount exceeds the staked balance.');
    return [tx('sellVoucher_newPOL', [amount, shares])];
  }
  if (!validator.active || !validator.delegation) throw new Error('This validator is not currently accepting delegations.');
  if (amount > await readPolygonBalance(owner)) throw new Error('Insufficient POL balance on Ethereum.');
  const allowance = await polygonStakingClient.readContract({ address: POL, abi: erc20Abi, functionName: 'allowance', args: [owner, STAKE_MANAGER] });
  return [
    ...(allowance < amount ? [{ to: POL as Address, value: BigInt(0), data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [STAKE_MANAGER, amount] }) }] : []),
    tx('buyVoucherPOL', [amount, shares]),
  ];
}
