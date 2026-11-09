'use client';

import { useState } from 'react';
import { useWallets, useConnectWallet } from '@iota/dapp-kit';
import { Button } from '@/components/ui/button';
import { useWalletTypeStore } from '@/stores/walletTypeStore';

export function IotaWalletOptions({ onConnected }: { onConnected: () => void }) {
  const wallets = useWallets();
  const connect = useConnectWallet();
  const setWalletType = useWalletTypeStore((state) => state.setWalletType);
  const [error, setError] = useState<string | null>(null);
  return <div className="space-y-3">{[{ name: 'IOTA Wallet', url: 'https://www.iota.org/products/wallet' }, { name: 'Nightly', url: 'https://nightly.app/' }].map((option) => {
    const wallet = wallets.find((item) => item.name === option.name);
    return <Button className="w-full" variant="outline" key={option.name} disabled={connect.isPending} onClick={async () => {
      if (!wallet) { window.open(option.url, '_blank', 'noopener,noreferrer'); return; }
      setError(null);
      try {
        const result = await connect.mutateAsync({ wallet });
        if (!result.accounts.some((account) => account.chains.includes('iota:mainnet'))) throw new Error('IOTA 메인넷 계정을 선택하세요.');
        setWalletType('iota'); onConnected();
      } catch (cause) { setError(cause instanceof Error ? cause.message : '지갑 연결에 실패했습니다.'); }
    }}>{option.name}{!wallet && ' 설치'}</Button>;
  })}{error && <p role="alert" className="text-destructive">{error}</p>}</div>;
}
