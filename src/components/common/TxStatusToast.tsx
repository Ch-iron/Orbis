'use client';

import { toast } from 'sonner';
import type { TxResult } from '@/hooks/useStakingActions';

const showTxToast = (result: TxResult, actionName: string) => {
  if (result.success) {
    toast.success(`${actionName} successful`, {
      description: result.txHash ? `Tx: ${result.txHash.slice(0, 16)}...` : undefined,
    });
    return;
  }

  toast.error(`${actionName} failed`, {
    description: result.error ?? 'Unknown error occurred',
  });
};

export { showTxToast };
