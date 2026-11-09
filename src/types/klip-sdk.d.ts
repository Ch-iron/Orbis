declare module 'klip-sdk' {
  type PrepareAuthParams = {
    bappName: string;
    successLink?: string;
    failLink?: string;
  };

  type PrepareExecuteContractParams = {
    bappName: string;
    from: string;
    to: string;
    value: string;
    abi: string;
    params: string;
    successLink?: string;
    failLink?: string;
  };

  type PrepareResponse = {
    request_key: string;
    status: number;
    err: string | null;
  };

  export type ResultResponse = {
    request_key: string;
    expiration_time: number;
    status: 'prepared' | 'requested' | 'completed' | 'canceled' | 'error';
    result: Record<string, unknown> | null;
  };

  export const prepare: {
    auth: (params: PrepareAuthParams) => Promise<PrepareResponse>;
    executeContract: (params: PrepareExecuteContractParams) => Promise<PrepareResponse>;
    sendKLAY: (params: Record<string, unknown>) => Promise<PrepareResponse>;
    sendToken: (params: Record<string, unknown>) => Promise<PrepareResponse>;
    sendCard: (params: Record<string, unknown>) => Promise<PrepareResponse>;
    signMessage: (params: Record<string, unknown>) => Promise<PrepareResponse>;
  };

  export const request: (
    requestKey: string,
    isKlipAppCall?: boolean,
    onUnsupportedEnvironment?: () => void,
  ) => void;

  export const getResult: (requestKey: string) => Promise<ResultResponse>;

  export const getCardList: (params: {
    contract: string;
    eoa: string;
    cursor?: string;
  }) => Promise<unknown>;
}
