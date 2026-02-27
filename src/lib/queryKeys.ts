// TanStack Query key factory for cache management
const queryKeys = {
  validators: (chainId: string) => ['validators', chainId] as const,
  delegations: (chainId: string, address: string) =>
    ['delegations', chainId, address] as const,
  rewards: (chainId: string, address: string) =>
    ['rewards', chainId, address] as const,
  unbonding: (chainId: string, address: string) =>
    ['unbonding', chainId, address] as const,
  balance: (chainId: string, address: string) =>
    ['balance', chainId, address] as const,
  txHistory: (chainId: string, address: string, page?: number) =>
    ['txHistory', chainId, address, page ?? 1] as const,
  stakingApy: (chainId: string) => ['stakingApy', chainId] as const,
};

export { queryKeys };
