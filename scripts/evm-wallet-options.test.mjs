import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path) {
  const context = { exports: {}, require: (name) => { throw new Error(`unexpected import ${name}`); } };
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(source, context);
  return context.exports;
}

const options = load('src/lib/wallet/evm-options.ts');
const { isMissingInjectedWallet } = load('src/features/wallet/evm-wallet-availability.ts');
// Array.from builds the array in this realm so deepEqual does not trip on the vm realm prototype
const labels = (list) => Array.from(list, (option) => option.label);

test('every chain list starts with MetaMask and ends with WalletConnect', () => {
  for (const name of ['EVM_WALLET_OPTIONS', 'ETHEREUM_WALLET_OPTIONS', 'SONIC_WALLET_OPTIONS', 'SEI_WALLET_OPTIONS', 'KAIA_WALLET_OPTIONS']) {
    const list = labels(options[name]);
    assert.equal(list[0], 'MetaMask', name);
    assert.equal(list.at(-1), 'WalletConnect', name);
  }
});

test('chains include their commonly used wallets', () => {
  assert.deepEqual(labels(options.EVM_WALLET_OPTIONS), ['MetaMask', 'WalletConnect']);
  assert.deepEqual(labels(options.ETHEREUM_WALLET_OPTIONS), ['MetaMask', 'Rabby Wallet', 'Coinbase Wallet', 'WalletConnect']);
  assert.deepEqual(labels(options.SONIC_WALLET_OPTIONS), ['MetaMask', 'Rabby Wallet', 'WalletConnect']);
  assert.deepEqual(labels(options.SEI_WALLET_OPTIONS), ['MetaMask', 'Compass Wallet', 'WalletConnect']);
  assert.deepEqual(labels(options.KAIA_WALLET_OPTIONS), ['MetaMask', 'Kaia Wallet', 'WalletConnect']);
});

test('wallet ids are unique within each list', () => {
  for (const list of Object.values(options)) {
    assert.equal(new Set(list.map((option) => option.connectorId)).size, list.length);
  }
});

const rabby = options.ETHEREUM_WALLET_OPTIONS.find((option) => option.id === 'rabby');
const metamask = options.EVM_WALLET_OPTIONS.find((option) => option.id === 'metamask');
const coinbase = options.ETHEREUM_WALLET_OPTIONS.find((option) => option.id === 'coinbase');

test('an injected connector for a wallet that is not installed is treated as missing', () => {
  // RainbowKit falls back to window.ethereum (e.g. MetaMask) when Rabby is absent
  assert.equal(isMissingInjectedWallet(rabby, { type: 'injected' }, () => false), true);
});

test('an installed injected wallet is not missing', () => {
  assert.equal(isMissingInjectedWallet(rabby, { type: 'injected' }, (flag) => flag === 'isRabby'), false);
});

test('SDK connectors are not gated on injection', () => {
  // MetaMask SDK and Coinbase SDK can connect through mobile deep links or popups without an extension
  assert.equal(isMissingInjectedWallet(metamask, { type: 'metaMask' }, () => false), false);
  assert.equal(isMissingInjectedWallet(coinbase, { type: 'coinbaseWallet' }, () => false), false);
});

test('options without an injection flag are never treated as missing', () => {
  const walletconnect = options.EVM_WALLET_OPTIONS.find((option) => option.id === 'walletconnect');
  assert.equal(isMissingInjectedWallet(walletconnect, { type: 'injected' }, () => false), false);
});
