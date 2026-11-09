'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
import { cardanoProvider, readCardanoAccount, readCardanoPools, readCardanoPoolHistory, readCardanoReceipt } from '@/lib/chains/cardano/client';
import { useCardanoWallet, checkCardanoAccount } from './wallet';
import { prepareCardanoAction, type CardanoAction } from './actions';
export function useCardanoStaking(pool: string) {
  const connection = useCardanoWallet((state) => state.connection);
  const walletType = useWalletTypeStore((state) => state.walletType);
  const enabled = walletType === 'cardano' && !!connection;
  const cache = useQueryClient();
  const pools = useQuery({ queryKey: ['cardano', 'pools'], queryFn: readCardanoPools, staleTime: 300_000 });
  const history = useQuery({ queryKey: ['cardano', pool, 'history'], queryFn: () => readCardanoPoolHistory(pool), enabled: !!pool });
  const parameters = useQuery({ queryKey: ['cardano', 'parameters'], queryFn: () => cardanoProvider.fetchProtocolParameters(), staleTime: 300_000 });
  const account = useQuery({ queryKey: ['cardano', connection?.stakeAddress, 'account'], queryFn: () => readCardanoAccount(connection!.stakeAddress), enabled });
  const balance = useQuery({ queryKey: ['cardano', connection?.address, 'balance'], queryFn: async () => { await checkCardanoAccount(connection!); const assets = await connection!.wallet.getBalance(); return BigInt(assets.find((asset) => asset.unit === 'lovelace')?.quantity ?? '0'); }, enabled });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const lock = useRef(false);
  const receipt = useQuery({ queryKey: ['cardano-receipt', hash], queryFn: () => readCardanoReceipt(hash!), enabled: !!hash, refetchInterval: (query) => query.state.data === 'success' || query.state.data === 'failed' ? false : 10_000 });
  useEffect(() => { if (receipt.data === 'success') void cache.invalidateQueries({ queryKey: ['cardano'] }); }, [receipt.data, cache]);
  async function execute(action: CardanoAction) {
    if (lock.current) return;
    lock.current = true; setPending(true); setError(null); setHash(null);
    try {
      if (!enabled || !connection) throw new Error('Cardano 지갑을 연결하세요.');
      await checkCardanoAccount(connection);
      const utxos = await connection.wallet.getUtxos();
      const unsigned = await prepareCardanoAction(connection.stakeAddress, connection.address, utxos, action);
      await checkCardanoAccount(connection);
      const signed = await connection.wallet.signTx(unsigned);
      await checkCardanoAccount(connection);
      setHash(await connection.wallet.submitTx(signed));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Cardano 거래에 실패했습니다.'); }
    finally { lock.current = false; setPending(false); }
  }
  return { connected: enabled, connection, pools, history, parameters, account, balance, pending, error, hash, receipt, execute };
}
