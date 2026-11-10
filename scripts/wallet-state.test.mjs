import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

function setup({ slug = 'kaia', walletType = null, evm = false, cosmos = false, klip = null, aptosNetwork = 1, suiChains = ['sui:mainnet'], iotaChains = ['iota:mainnet'] } = {}) {
  const activated = [];
  const imports = {
    react: { useEffect: fn => fn() },
    '@/features/avalanche-staking/wallet': { useAvalancheWallet: fn => fn({ connection: null }) },
    '@/features/cardano-staking/wallet': { useCardanoWallet: fn => fn({ connection: null }) },
    '@vechain/dapp-kit-react': { useWallet: () => ({ account: null }) },
    '@tonconnect/ui-react': { useTonWallet: () => null, useTonConnectUI: () => [{}] },
    '@/features/multiversx-staking/wallet': { useMultiversxWallet: fn => fn({ address: null }) },
    '@/features/near-staking/wallet': { useNearWallet: fn => fn({ address: null }) },
    '@aptos-labs/wallet-adapter-react': { useWallet: () => ({ connected: true, account: { address: 'aptos-owner' }, network: { chainId: aptosNetwork } }) },
    '@txnlab/use-wallet-react': { useWallet: () => ({}) },
    '@iota/dapp-kit': { useCurrentAccount: () => ({ address: 'iota-owner', chains: iotaChains }), useDisconnectWallet: () => ({}) },
    '@mysten/dapp-kit-react': { useCurrentAccount: () => ({ address: 'sui-owner', chains: suiChains }), useDAppKit: () => ({}) },
    '@/features/sui-staking/walletconnect': { useSuiWalletConnect: fn => fn({ connection: null }) },
    '@cosmos-kit/react': { useChain: () => ({}) },
    '@xpla/wallet-provider': { useWallet: () => ({ status: cosmos ? 'connected' : 'disconnected', availableConnections: [], availableInstallations: [] }), useConnectedWallet: () => cosmos ? { xplaAddress: 'xpla1owner' } : null, WalletStatus: { WALLET_CONNECTED: 'connected', WALLET_NOT_CONNECTED: 'disconnected' } },
    wagmi: { useAccount: () => ({ address: evm ? '0xowner' : undefined, isConnected: evm }), useDisconnect: () => ({}) },
    '@tanstack/react-query': { useQuery: () => ({}) },
    '@/stores/walletTypeStore': { useWalletTypeStore: fn => fn({ walletType, setWalletType: type => activated.push(type) }) },
    '@/stores/klipStore': { useKlipStore: fn => fn({ klipAddress: klip }) },
    '@/stores/chainStore': { useChainStore: fn => fn({ selectedChainSlug: slug }) },
    '@/lib/chains/registry': { CHAIN_REGISTRY: Object.fromEntries(['kaia', 'sei', 'xpla', 'sui', 'iota', 'aptos'].map(id => [id, { slug: id }])) },
    '@/lib/utils/address': {}, '@/lib/chains/address-resolution': {},
  };
  const context = { exports: {}, require: name => { if (!(name in imports)) throw new Error(name); return imports[name]; } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/hooks/useWalletInfo.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  return { info: context.exports.useWalletInfo(), activated };
}

test('a dormant EVM session cannot reactivate a disconnected or explicitly selected Cosmos wallet', () => {
  for (const walletType of [null, 'cosmos']) assert.deepEqual(setup({ walletType, evm: true }).activated, []);
});
test('an old XPLA session is never reported as connected on another chain', () => {
  const { info } = setup({ slug: 'sei', walletType: 'cosmos', cosmos: true });
  assert.equal(info.isConnected, false); assert.equal(info.walletAddress, null);
});
test('an unselected XPLA session cannot replace a disconnected EVM wallet', () => {
  const { info } = setup({ slug: 'xpla', walletType: 'evm', cosmos: true });
  assert.equal(info.isConnected, false); assert.equal(info.walletAddress, null);
});
test('a selected XPLA wallet still exposes its native address', () => {
  const { info } = setup({ slug: 'xpla', walletType: 'cosmos', cosmos: true });
  assert.equal(info.isConnected, true); assert.equal(info.walletAddress, 'xpla1owner');
});
test('Klip is usable only on Kaia even when navigating directly to another chain', () => {
  const { info } = setup({ slug: 'sei', walletType: 'klip', klip: '0xklip' });
  assert.equal(info.isConnected, false); assert.equal(info.walletAddress, null);
  assert.equal(setup({ walletType: 'klip', klip: '0xklip' }).info.isConnected, true);
});
test('Aptos testnet accounts are not shown as mainnet connections', () => {
  assert.equal(setup({ slug: 'aptos', walletType: 'aptos', aptosNetwork: 2 }).info.isConnected, false);
  assert.equal(setup({ slug: 'aptos', walletType: 'aptos' }).info.isConnected, true);
});
test('Sui and IOTA require the current account to support mainnet', () => {
  for (const slug of ['sui', 'iota']) {
    assert.equal(setup({ slug, walletType: slug, [`${slug}Chains`]: [`${slug}:testnet`] }).info.isConnected, false);
    assert.equal(setup({ slug, walletType: slug }).info.isConnected, true);
  }
});
