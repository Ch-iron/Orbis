// Kaia PublicDelegation and CnStakingV3 contract ABIs

// CnStakingV3: each validator's staking contract
const CN_STAKING_V3_ABI = [
  {
    type: 'function',
    name: 'publicDelegation',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'nodeId',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'gcId',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

// PublicDelegation: ERC-4626 based public staking vault
const PUBLIC_DELEGATION_ABI = [
  // Staking
  {
    type: 'function',
    name: 'stakeKaia',
    inputs: [],
    outputs: [],
    stateMutability: 'payable',
  },
  // Unstaking (2-step: withdraw -> claim)
  {
    type: 'function',
    name: 'withdraw',
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'owner', type: 'address' },
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  // Claim completed unbonding
  {
    type: 'function',
    name: 'claim',
    inputs: [{ name: 'requestId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  // Instant redelegate to another validator
  {
    type: 'function',
    name: 'redelegate',
    inputs: [
      { name: 'targetStaking', type: 'address' },
      { name: 'shares', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  // View: user's shares (pdKAIA balance)
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  // View: convert shares to KAIA value
  {
    type: 'function',
    name: 'convertToAssets',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  // View: convert KAIA to shares
  {
    type: 'function',
    name: 'convertToShares',
    inputs: [{ name: 'assets', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  // View: total staked KAIA in this vault
  {
    type: 'function',
    name: 'totalAssets',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  // View: max KAIA withdrawable
  {
    type: 'function',
    name: 'maxWithdraw',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  // View: pending withdrawal request IDs
  {
    type: 'function',
    name: 'getRequestIds',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  // View: withdrawal request details
  {
    type: 'function',
    name: 'getRequestInfo',
    inputs: [{ name: 'requestId', type: 'uint256' }],
    outputs: [
      { name: 'withdrawableFrom', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
      { name: 'claimed', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  // View: commission rate (basis points)
  {
    type: 'function',
    name: 'commissionRate',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

export { CN_STAKING_V3_ABI, PUBLIC_DELEGATION_ABI };
