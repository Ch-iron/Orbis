import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const cases = [
 ['aptos', 'src/features/aptos-staking/useAptosStaking.ts', 'useAptosStaking'],
 ['aptos', 'src/features/aptos-liquid-staking/useAmnisStaking.ts', 'useAmnisStaking'],
 ['sui', 'src/features/sui-staking/useSuiStaking.ts', 'useSuiStaking'],
 ['sui', 'src/features/sui-liquid-staking/useHaedalStaking.ts', 'useHaedalStaking'],
 ['iota', 'src/features/iota-staking/useIotaStaking.ts', 'useIotaStaking'],
 ['iota', 'src/features/iota-liquid-staking/useSwirlStaking.ts', 'useSwirlStaking'],
];
function run(chain, path, name, mainnet) {
 const queries = [];
 const account = { address: '0x1', chains: [`${chain}:${mainnet ? 'mainnet' : 'testnet'}`] };
 const imports = {
  react: { useRef: current => ({ current }), useState: initial => [initial, () => {}] },
  '@tanstack/react-query': { useQuery: query => { queries.push(query); return {}; }, useQueryClient: () => ({}) },
  '@/stores/walletTypeStore': { useWalletTypeStore: select => select({ walletType: chain }) },
  '@aptos-labs/wallet-adapter-react': { useWallet: () => ({ account, connected: true, network: { chainId: mainnet ? 1 : 2 } }) },
  '@mysten/dapp-kit-react': { useCurrentAccount: () => account, useDAppKit: () => ({}) },
  '@iota/dapp-kit': { useCurrentAccount: () => account, useSignTransaction: () => ({}) },
  './walletconnect': { useSuiWalletConnect: select => select({ connection: null }) },
  '@/features/sui-staking/walletconnect': { useSuiWalletConnect: select => select({ connection: null }) },
  '@/lib/chains/aptos/client': { aptosAddress: value => value },
 };
 const context = { exports: {}, require: name => imports[name] ?? {} };
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
 return { result: context.exports[name](), queries };
}
for (const [chain, path, name] of cases) {
 test(`${name}: testnet account cannot enable mainnet position reads or actions`, () => {
  const wrong = run(chain, path, name, false);
  assert.equal(wrong.result.owner, undefined);
  assert.ok(wrong.queries.filter(query => 'enabled' in query).every(query => !query.enabled));
  assert.equal(run(chain, path, name, true).result.owner, '0x1');
 });
}
