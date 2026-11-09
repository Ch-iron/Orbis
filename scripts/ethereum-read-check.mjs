import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import * as viem from 'viem';
import * as chains from 'viem/chains';
function load(path, imports) {
 const context = { exports: {}, require: name => { if (!(name in imports)) throw new Error(name); return imports[name]; } };
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
 return context.exports;
}
const contracts = load('src/lib/chains/ethereum/contracts.ts', { viem });
const client = load('src/lib/chains/ethereum/client.ts', { viem, 'viem/chains': chains, './contracts': contracts });
const owner = '0x0000000000000000000000000000000000000001';
const results = await Promise.allSettled([client.readEthereumPositions(owner), client.readLidoWithdrawals(owner), client.readLidoLimits(owner), client.readRocketPool()]);
for (const [index, result] of results.entries()) {
 if (result.status === 'rejected') { console.error(index, result.reason.shortMessage ?? result.reason.message); process.exitCode = 1; }
 else console.log(index, JSON.stringify(result.value, (_, value) => typeof value === 'bigint' ? value.toString() : value));
}
