// Detect whether a browser extension wallet is installed.
// Checks both top-level window properties (e.g. window.keplr, window.leap)
// and window.ethereum provider flags (e.g. isMetaMask), including EIP-5749 multi-provider arrays.

const isWalletInstalled = (flag: string): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const windowRecord = window as unknown as Record<string, unknown>;

  // Top-level window property (Cosmos wallets: keplr, leap, cosmostation, etc.)
  if (!!windowRecord[flag]) {
    return true;
  }

  // EVM provider flags (MetaMask: isMetaMask, Rabby: isRabby, etc.)
  const ethereum = windowRecord.ethereum as Record<string, unknown> | undefined;

  if (!ethereum) {
    return false;
  }

  // EIP-5749: multiple providers in window.ethereum.providers array
  const providers = ethereum.providers as Record<string, unknown>[] | undefined;

  if (Array.isArray(providers)) {
    return providers.some((provider) => !!provider[flag]);
  }

  return !!ethereum[flag];
};

export { isWalletInstalled };
