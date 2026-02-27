// Maps internal chain config IDs to cosmos-kit chain names

const COSMOS_KIT_CHAIN_MAP: Record<string, string> = {
  'dimension_37-1': 'xpla',
  'cube_47-5': 'xplatestnet',
};

const getCosmosKitChainName = (chainId: string): string | null => {
  return COSMOS_KIT_CHAIN_MAP[chainId] ?? null;
};

export { COSMOS_KIT_CHAIN_MAP, getCosmosKitChainName };
