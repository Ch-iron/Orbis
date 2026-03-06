// Generic EVM-to-Cosmos address resolution via LCD endpoint

type AssociationResponse = {
  sei_address: string;
  associated: boolean;
};

// Resolve EVM address to Cosmos bech32 address using on-chain association query.
// endpointTemplate must contain `{evmAddress}` placeholder.
const fetchAssociatedCosmosAddress = async (
  lcdUrl: string,
  endpointTemplate: string,
  evmAddress: string,
): Promise<string | null> => {
  const endpoint = endpointTemplate.replace('{evmAddress}', encodeURIComponent(evmAddress));

  const response = await fetch(`${lcdUrl}${endpoint}`).catch((fetchError) => {
    console.error('address resolution fetch error', fetchError);
    return null;
  });

  if (!response?.ok) {
    return null;
  }

  const data: AssociationResponse | null = await response.json().catch((parseError) => {
    console.error('address resolution parse error', parseError);
    return null;
  });

  if (!data?.associated || !data.sei_address) {
    return null;
  }

  return data.sei_address;
};

export { fetchAssociatedCosmosAddress };
