'use client';
import { useRef, useState } from 'react';
import { useWallet } from '@vechain/dapp-kit-react';
import { Button } from '@/components/ui/button';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
export function VechainWalletOptions({ onConnected }: { onConnected: () => void }) {
  const wallet = useWallet();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  async function connect(source: 'veworld' | 'sync2' | 'wallet-connect') {
    if (lock.current) return;
    lock.current = true; setPending(true); setError(null);
    try {
      wallet.setSource(source);
      const result = await wallet.connect();
      if (!result.account) throw new Error('VeChain 계정을 선택하세요.');
      useWalletTypeStore.getState().setWalletType('vechain'); onConnected();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'VeChain 지갑 연결에 실패했습니다.'); }
    finally { lock.current = false; setPending(false); }
  }
  return <div className="space-y-3"><Button className="w-full" variant="outline" disabled={pending} onClick={() => connect('veworld')}>VeWorld</Button><Button className="w-full" variant="outline" disabled={pending} onClick={() => connect('sync2')}>Sync2</Button><Button className="w-full" variant="outline" disabled={pending || !process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID} onClick={() => connect('wallet-connect')}>WalletConnect</Button>{!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID && <p className="text-xs">WalletConnect 연결 설정이 필요합니다.</p>}{error && <p role="alert" className="text-destructive">{error}</p>}</div>;
}
