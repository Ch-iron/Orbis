import type { Delegation } from '@/lib/chains/types';

// A donut puts every slice next to every other one, and only three categorical colors stay
// distinguishable as all pairs (checked with the dataviz palette validator). The rest fold into Other.
const NAMED_SLICE_LIMIT = 3;
const BASIS_POINTS = BigInt(10000);

type AllocationSlice = {
  key: string;
  label: string;
  amount: string;
  basisPoints: number;
  colorVar: string;
};

export function toAllocationSlices(delegations: Delegation[]): AllocationSlice[] {
  const positions = delegations
    .filter((position) => BigInt(position.amount) > BigInt(0))
    .sort((left, right) => compareAmountDescending(BigInt(left.amount), BigInt(right.amount)));
  const total = positions.reduce((sum, position) => sum + BigInt(position.amount), BigInt(0));
  const named = positions.slice(0, NAMED_SLICE_LIMIT);
  const folded = positions.slice(NAMED_SLICE_LIMIT);

  const slices = named.map((position, index) => toSlice(
    `${position.validatorAddress}:${index}`,
    position.validatorName || position.validatorAddress,
    BigInt(position.amount),
    total,
    `--allocation-${index + 1}`,
  ));

  if (folded.length > 0) {
    const foldedAmount = folded.reduce((sum, position) => sum + BigInt(position.amount), BigInt(0));
    const label = `Other (${folded.length} position${folded.length === 1 ? '' : 's'})`;
    slices.push(toSlice('other', label, foldedAmount, total, '--allocation-other'));
  }

  return slices;
}

function compareAmountDescending(left: bigint, right: bigint) {
  if (left === right) return 0;
  return left > right ? -1 : 1;
}

function toSlice(key: string, label: string, amount: bigint, total: bigint, colorVar: string): AllocationSlice {
  return {
    key,
    label,
    amount: amount.toString(),
    basisPoints: Number(amount * BASIS_POINTS / total),
    colorVar,
  };
}
