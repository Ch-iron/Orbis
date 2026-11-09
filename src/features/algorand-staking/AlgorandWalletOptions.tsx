'use client';

import { useRef, useState } from 'react';
import { useWallet, useNetwork } from '@txnlab/use-wallet-react';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
import { WALLET_CONNECT_PROJECT_ID } from '@/lib/wallet/constants';
import { Button } from '@/components/ui/button';

export function AlgorandWalletOptions({ onConnected }: { onConnected: () => void }) {
  const { wallets } = useWallet();
  const { setActiveNetwork } = useNetwork();
  const setWalletType = useWalletTypeStore((state) => state.setWalletType);
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return <div className="space-y-3">
    {wallets.map((wallet) => <Button key={wallet.id} variant="outline" className="w-full" disabled={pending} onClick={async () => {
      if (lock.current) return;
      lock.current = true;
      setPending(true);
      setError(null);
      try {
        await setActiveNetwork('mainnet');
        await wallet.connect();
        wallet.setActive();
        if (!wallet.accounts.length) throw new Error('지갑 계정을 확인하지 못했습니다.');
        setWalletType('algorand');
        onConnected();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : '지갑 연결에 실패했습니다.');
      } finally { lock.current = false; setPending(false); }
    }}>{wallet.metadata.name}</Button>)}
    {!WALLET_CONNECT_PROJECT_ID && <><Button variant="outline" className="w-full" disabled>WalletConnect</Button><p className="text-sm text-muted-foreground">WalletConnect 프로젝트 ID 설정이 필요합니다.</p></>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}
