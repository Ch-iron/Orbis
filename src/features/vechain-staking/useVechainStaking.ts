'use client';
import { useEffect, useRef, useState } from 'react';
import { useWallet } from '@vechain/dapp-kit-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAddress } from 'viem';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
import { readVechainBalance, readVechainLevels, readVechainValidators, readVechainPositions, readVechainBlock, readVechainReceipt } from '@/lib/chains/vechain/client';
import { prepareVechainAction, type VechainAction } from './actions';
export function useVechainStaking() {
  const wallet = useWallet();
  const walletType = useWalletTypeStore((state) => state.walletType);
  const owner = walletType === 'vechain' && wallet.account ? getAddress(wallet.account) : undefined;
  const current = useRef(wallet.account); current.current = wallet.account;
  const cache = useQueryClient();
  const levels = useQuery({ queryKey: ['vechain', 'levels'], queryFn: readVechainLevels });
  const validators = useQuery({ queryKey: ['vechain', 'validators'], queryFn: readVechainValidators, staleTime: 300_000 });
  const positions = useQuery({ queryKey: ['vechain', owner, 'positions'], queryFn: () => readVechainPositions(owner!), enabled: !!owner });
  const balance = useQuery({ queryKey: ['vechain', owner, 'balance'], queryFn: () => readVechainBalance(owner!), enabled: !!owner });
  const block = useQuery({ queryKey: ['vechain', 'block'], queryFn: readVechainBlock, refetchInterval: 30_000 });
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const receipt = useQuery({ queryKey: ['vechain-receipt', hash], queryFn: () => readVechainReceipt(hash!), enabled: !!hash, refetchInterval: (query) => query.state.data === 'success' || query.state.data === 'failed' ? false : 10_000 });
  useEffect(() => { if (receipt.data === 'success') void cache.invalidateQueries({ queryKey: ['vechain'] }); }, [receipt.data, cache]);
  async function execute(action: VechainAction) {
    if (lock.current) return;
    lock.current = true; setPending(true); setError(null); setHash(null);
    try {
      const check = () => { if (!owner || current.current?.toLowerCase() !== owner.toLowerCase()) throw new Error('연결된 VeChain 계정을 확인하세요.'); };
      check();
      const clauses = await prepareVechainAction(owner!, action);
      check();
      const sent = await wallet.requestTransaction(clauses, { signer: owner });
      if (sent.signer.toLowerCase() !== owner!.toLowerCase()) throw new Error('다른 계정에서 거래를 보냈습니다. 지갑에서 거래 내역을 확인하세요.');
      setHash(sent.txid);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'VeChain 거래에 실패했습니다.'); }
    finally { lock.current = false; setPending(false); }
  }
  return { owner, levels, validators, positions, balance, block, execute, pending, error, hash, receipt };
}
