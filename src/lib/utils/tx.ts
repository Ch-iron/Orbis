// Transaction status and state types for tracking tx lifecycle

type TxStatus = 'idle' | 'pending' | 'success' | 'error';

type TxState = {
  status: TxStatus;
  hash: string | null;
  error: string | null;
};

const INITIAL_TX_STATE: TxState = {
  status: 'idle',
  hash: null,
  error: null,
};

export { INITIAL_TX_STATE };
export type { TxStatus, TxState };
