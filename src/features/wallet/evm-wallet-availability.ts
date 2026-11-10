import type { EvmWalletOption } from '@/lib/chains/types';

type ConnectorKind = { type: string };

// RainbowKit creates an injected connector even when the wallet is absent and points it at
// whichever provider owns window.ethereum, so connecting it would sign in with a different wallet.
// SDK connectors (MetaMask SDK, Coinbase SDK) are excluded because they connect without an extension.
export function isMissingInjectedWallet(
  option: EvmWalletOption,
  connector: ConnectorKind,
  isInstalled: (flag: string) => boolean,
) {
  return connector.type === 'injected' && !!option.injectedFlag && !isInstalled(option.injectedFlag);
}
