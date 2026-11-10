export function hasLiquidStaking(chainId: string) {
  return ['multiversx', 'polygon', 'kaia', 'ethereum', 'near', 'sui', 'sonic', 'ton', 'iotex', 'aptos', 'avalanche', 'iota', 'algorand'].includes(chainId);
}
