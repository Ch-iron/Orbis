import { fetchTonApi } from '@/lib/chains/ton/transport';
import { beginCell, Cell, loadMessage } from '@ton/core';
import { tonAddress } from '@/lib/chains/ton/client';
export function tonMessageHash(boc: string) {
  const message = loadMessage(Cell.fromBase64(boc).beginParse());
  if (message.info.type !== 'external-in') throw new Error('지갑이 외부 메시지를 반환하지 않았습니다.');
  return beginCell().storeUint(2, 2).storeUint(0, 2).storeAddress(message.info.dest).storeUint(0, 4).storeBit(false).storeBit(true).storeRef(message.body).endCell().hash().toString('hex');
}
type Trace = { emulated?: boolean; transaction: { success: boolean; aborted: boolean; account: { address: string } }; children?: Trace[] };
export function inspectTonTrace(trace: Trace, pool: string): 'pending' | 'success' | 'failed' {
  const queue = [trace];
  let reachedPool = false;
  while (queue.length) {
    const item = queue.pop()!;
    if (item.emulated) return 'pending';
    if (!item.transaction.success || item.transaction.aborted) return 'failed';
    if (tonAddress(item.transaction.account.address) === tonAddress(pool)) reachedPool = true;
    queue.push(...item.children ?? []);
  }
  return reachedPool ? 'success' : 'pending';
}
export async function readTonReceipt(hash: string, pool: string) {
  const response = await fetchTonApi(`/traces/${hash}`);
  if (response.status === 404) return 'pending' as const;
  if (!response.ok) throw new Error(`TON 거래 확인 실패 (${response.status})`);
  return inspectTonTrace(await response.json(), pool);
}
