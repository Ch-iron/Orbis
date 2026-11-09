'use client';

import { useRef, useState } from 'react';
import { useWallets, useDAppKit } from '@mysten/dapp-kit-react';
import type { OrbisSuiKit } from '@/lib/wallet/suiProvider';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
import { WALLET_CONNECT_PROJECT_ID } from '@/lib/wallet/constants';
import { connectSuiWalletConnect, disconnectSuiWalletConnect, useSuiWalletConnect } from './walletconnect';

export function SuiWalletOptions({ onConnected }: { onConnected: () => void }) {
  const wallets = useWallets();
  const kit = useDAppKit<OrbisSuiKit>();
  const setWalletType = useWalletTypeStore((state) => state.setWalletType);
  const uri = useSuiWalletConnect((state) => state.uri);
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const connect = async (name: string) => {
    if (lock.current) return;
    lock.current = true; setPending(true); setError(null);
    try {
      if (name === 'WalletConnect') { await kit.disconnectWallet(); await connectSuiWalletConnect(); }
      else {
        const wallet = wallets.find((item) => name === 'Slush' ? item.name.includes('Slush') : item.name === name);
        if (!wallet) { window.open(name === 'Slush' ? 'https://slush.app/' : 'https://nightly.app/', '_blank', 'noopener,noreferrer'); return; }
        await disconnectSuiWalletConnect();
        kit.switchNetwork('mainnet');
        const result = await kit.connectWallet({ wallet });
        if (!result.accounts.some((account) => account.chains.includes('sui:mainnet'))) throw new Error('Sui 메인넷 계정을 선택하세요.');
      }
      setWalletType('sui'); onConnected();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Sui 지갑 연결에 실패했습니다.'); }
    finally { lock.current = false; setPending(false); }
  };
  return <div className="space-y-3">{['Slush', 'Nightly', 'WalletConnect'].map((name) => <Button className="w-full" variant="outline" key={name} disabled={pending || (name === 'WalletConnect' && !WALLET_CONNECT_PROJECT_ID)} onClick={() => connect(name)}>{name}</Button>)}{!WALLET_CONNECT_PROJECT_ID && <p className="text-sm text-muted-foreground">WalletConnect 프로젝트 ID 설정이 필요합니다.</p>}{uri && <div className="space-y-2"><QRCodeSVG value={uri} size={256} className="mx-auto bg-white p-2" /><a className="block text-center underline" href={uri}>모바일 지갑에서 열기</a></div>}{error && <p role="alert" className="text-destructive">{error}</p>}</div>;
}
