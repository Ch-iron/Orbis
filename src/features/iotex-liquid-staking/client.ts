import { erc20Abi, type Address } from 'viem';
import { iotexClient } from '@/lib/chains/iotex/client';
import { BEDROCK, UNIIOTX, BEDROCK_ABI, CLEAR_ABI } from './contracts';

export async function readBedrockPosition(owner: Address) {
  const [available, receipt, supply, allowance, reserve, redeemBase, clear, paused, tokenPaused, rate, block] = await Promise.all([
    iotexClient.getBalance({ address: owner }),
    iotexClient.readContract({ address: UNIIOTX, abi: erc20Abi, functionName: 'balanceOf', args: [owner] }),
    iotexClient.readContract({ address: UNIIOTX, abi: erc20Abi, functionName: 'totalSupply' }),
    iotexClient.readContract({ address: UNIIOTX, abi: erc20Abi, functionName: 'allowance', args: [owner, BEDROCK] }),
    iotexClient.readContract({ address: BEDROCK, abi: BEDROCK_ABI, functionName: 'currentReserve' }),
    iotexClient.readContract({ address: BEDROCK, abi: BEDROCK_ABI, functionName: 'getRedeemAmountBase' }),
    iotexClient.readContract({ address: BEDROCK, abi: BEDROCK_ABI, functionName: 'iotxClear' }),
    iotexClient.readContract({ address: BEDROCK, abi: BEDROCK_ABI, functionName: 'paused' }),
    iotexClient.readContract({ address: UNIIOTX, abi: BEDROCK_ABI, functionName: 'paused' }),
    iotexClient.readContract({ address: BEDROCK, abi: BEDROCK_ABI, functionName: 'exchangeRatio' }),
    iotexClient.getBlock(),
  ]);
  const [claimable, debt, clearPaused] = await Promise.all([
    iotexClient.readContract({ address: clear, abi: CLEAR_ABI, functionName: 'getBalance', args: [owner] }),
    iotexClient.readContract({ address: clear, abi: CLEAR_ABI, functionName: 'getDebt', args: [owner] }),
    iotexClient.readContract({ address: clear, abi: CLEAR_ABI, functionName: 'paused' }),
  ]);
  return { available, receipt, supply, allowance, reserve, redeemBase, clear, paused, tokenPaused, rate, claimable, debt, clearPaused, timestamp: block.timestamp };
}
