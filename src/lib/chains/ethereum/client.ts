import { createPublicClient, http, keccak256, stringToHex, zeroAddress } from 'viem';
import type { Address } from 'viem';
import { mainnet } from 'viem/chains';
import { STETH, STETH_ABI, LIDO_QUEUE, QUEUE_ABI, RETH, RETH_ABI, ROCKET_STORAGE, STORAGE_ABI, DEPOSIT_ABI, DEPOSIT_SETTINGS_ABI } from './contracts';

export const ethereumClient = createPublicClient({ chain: mainnet, transport: http('https://ethereum-rpc.publicnode.com') });

export async function readEthereumPositions(owner: Address) {
  const [eth, steth, reth] = await Promise.all([
    ethereumClient.getBalance({ address: owner }),
    ethereumClient.readContract({ address: STETH, abi: STETH_ABI, functionName: 'balanceOf', args: [owner] }),
    ethereumClient.readContract({ address: RETH, abi: RETH_ABI, functionName: 'balanceOf', args: [owner] }),
  ]);
  const rethEth = await ethereumClient.readContract({ address: RETH, abi: RETH_ABI, functionName: 'getEthValue', args: [reth] });
  return { eth, steth, reth, rethEth };
}

export async function readLidoWithdrawals(owner: Address) {
  const ids = await ethereumClient.readContract({ address: LIDO_QUEUE, abi: QUEUE_ABI, functionName: 'getWithdrawalRequests', args: [owner] });
  if (ids.length === 0) return [];
  const statuses = await ethereumClient.readContract({ address: LIDO_QUEUE, abi: QUEUE_ABI, functionName: 'getWithdrawalStatus', args: [ids] });
  return statuses.map((status, index) => ({ ...status, id: ids[index] })).filter((request) => !request.isClaimed);
}

export async function readLidoLimits(owner: Address) {
  const [depositLimit, minWithdrawal, maxWithdrawal, allowance] = await Promise.all([
    ethereumClient.readContract({ address: STETH, abi: STETH_ABI, functionName: 'getCurrentStakeLimit' }),
    ethereumClient.readContract({ address: LIDO_QUEUE, abi: QUEUE_ABI, functionName: 'MIN_STETH_WITHDRAWAL_AMOUNT' }),
    ethereumClient.readContract({ address: LIDO_QUEUE, abi: QUEUE_ABI, functionName: 'MAX_STETH_WITHDRAWAL_AMOUNT' }),
    ethereumClient.readContract({ address: STETH, abi: STETH_ABI, functionName: 'allowance', args: [owner, LIDO_QUEUE] }),
  ]);
  return { depositLimit, minWithdrawal, maxWithdrawal, allowance };
}

export async function readRocketPool() {
  const [depositAddress, settingsAddress] = await Promise.all([
    resolveRocketContract('rocketDepositPool'),
    resolveRocketContract('rocketDAOProtocolSettingsDeposit'),
  ]);
  const [enabled, minimum, maximum, fee, collateral, exchangeRate] = await Promise.all([
    ethereumClient.readContract({ address: settingsAddress, abi: DEPOSIT_SETTINGS_ABI, functionName: 'getDepositEnabled' }),
    ethereumClient.readContract({ address: settingsAddress, abi: DEPOSIT_SETTINGS_ABI, functionName: 'getMinimumDeposit' }),
    ethereumClient.readContract({ address: depositAddress, abi: DEPOSIT_ABI, functionName: 'getMaximumDepositAmount' }),
    ethereumClient.readContract({ address: settingsAddress, abi: DEPOSIT_SETTINGS_ABI, functionName: 'getDepositFee' }),
    ethereumClient.readContract({ address: RETH, abi: RETH_ABI, functionName: 'getTotalCollateral' }),
    ethereumClient.readContract({ address: RETH, abi: RETH_ABI, functionName: 'getEthValue', args: [BigInt('1000000000000000000')] }),
  ]);
  return { depositAddress, enabled, minimum, maximum, fee, collateral, exchangeRate };
}

async function resolveRocketContract(name: string) {
  const address = await ethereumClient.readContract({
    address: ROCKET_STORAGE, abi: STORAGE_ABI, functionName: 'getAddress',
    args: [keccak256(stringToHex(`contract.address${name}`))],
  });
  if (address === zeroAddress) throw new Error(`Rocket Pool contract is unavailable: ${name}`);
  return address;
}
