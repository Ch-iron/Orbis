// Klip A2A SDK wrapper for auth and contract execution

import { prepare, getResult, type ResultResponse } from 'klip-sdk';
import { useKlipRequestStore } from '@/stores/klipRequestStore';

const BAPP_NAME = 'Orbis';
const KLIP_API_URL = 'https://a2a-api.klipwallet.com/v2/a2a';
const KLIP_DEEP_LINK_BASE = 'https://klipwallet.com/?target=/a2a?request_key=';
const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

type ExecuteContractParams = {
  from: string;
  to: string;
  value: string;
  encodedFunctionCall: string;
};

type KlipPrepareResponse = {
  request_key: string;
  status: number;
  err: string | null;
  error?: { code: number; message: string };
};

const getKlipDeepLink = (requestKey: string): string => {
  return `${KLIP_DEEP_LINK_BASE}${requestKey}`;
};

// Poll Klip A2A result until completed, canceled, or timed out.
// Checks klipRequestStore each iteration — clearing the store cancels the poll.
const pollForResult = async (requestKey: string): Promise<ResultResponse> => {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (!useKlipRequestStore.getState().requestKey) {
      throw new Error('Klip request cancelled');
    }

    const result = await getResult(requestKey).catch((pollError: unknown) => {
      console.error('klip poll error', pollError);
      return null;
    });

    if (!result) {
      await new Promise((resolve) => { setTimeout(resolve, POLL_INTERVAL_MS); });
      continue;
    }

    if (result.status === 'completed') {
      return result;
    }

    if (result.status === 'canceled' || result.status === 'error') {
      throw new Error(`Klip request ${result.status}`);
    }

    await new Promise((resolve) => { setTimeout(resolve, POLL_INTERVAL_MS); });
  }

  throw new Error('Klip request timed out');
};

const klipAuth = async (): Promise<string> => {
  const prepareResult = await prepare.auth({ bappName: BAPP_NAME }).catch((prepareError: unknown) => {
    console.error('klip auth prepare error', prepareError);
    return null;
  });

  if (!prepareResult?.request_key) {
    throw new Error('Failed to prepare Klip auth');
  }

  const requestKey = prepareResult.request_key;
  useKlipRequestStore.getState().setRequest(requestKey, 'auth');

  const result = await pollForResult(requestKey);
  useKlipRequestStore.getState().clearRequest();

  const klaytnAddress = result.result?.['klaytn_address'] as string | undefined;

  if (!klaytnAddress) {
    throw new Error('Failed to get address from Klip');
  }

  return klaytnAddress;
};

// Prepare execute_contract via REST API with encoded_function_call
// to bypass Klip SDK's ABI encoding which can produce incorrect calldata
const prepareExecuteContract = async (params: ExecuteContractParams): Promise<KlipPrepareResponse> => {
  const response = await fetch(`${KLIP_API_URL}/prepare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bapp: { name: BAPP_NAME },
      type: 'execute_contract',
      transaction: {
        from: params.from,
        to: params.to,
        value: params.value,
        encoded_function_call: params.encodedFunctionCall,
      },
    }),
  });

  return response.json();
};

const klipExecuteContract = async (params: ExecuteContractParams): Promise<string> => {
  const prepareResult = await prepareExecuteContract(params).catch((prepareError: unknown) => {
    console.error('klip executeContract prepare error', prepareError);
    return null;
  });

  if (!prepareResult?.request_key) {
    console.error('klip prepare failed - full response', prepareResult);
    throw new Error('Failed to prepare Klip transaction');
  }

  if (prepareResult.error && Object.keys(prepareResult.error).length > 0) {
    console.error('klip prepare error detail', prepareResult.error);
    throw new Error(`Klip prepare error: ${JSON.stringify(prepareResult.error)}`);
  }

  const requestKey = prepareResult.request_key;
  useKlipRequestStore.getState().setRequest(requestKey, 'executeContract');

  const result = await pollForResult(requestKey);
  useKlipRequestStore.getState().clearRequest();

  const txHash = result.result?.['tx_hash'] as string | undefined;

  if (!txHash) {
    throw new Error('Failed to get tx hash from Klip');
  }

  return txHash;
};

export { klipAuth, klipExecuteContract, getKlipDeepLink };
export type { ExecuteContractParams };
