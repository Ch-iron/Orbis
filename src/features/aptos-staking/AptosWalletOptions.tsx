'use client';
import { useEffect, useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Network } from '@aptos-labs/ts-sdk';
import { Button } from '@/components/ui/button';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
export function AptosWalletOptions({ onConnected }: { onConnected: () => void }) {
  const wallet = useWallet();
  const setWalletType = useWalletTypeStore((state) => state.setWalletType);
  const [requested, setRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (requested && wallet.connected && Number(wallet.network?.chainId) === 1) { setWalletType('aptos'); onConnected(); }
  }, [requested, wallet.connected, wallet.network?.chainId, setWalletType, onConnected]);
  return <div className="space-y-3">{[{ name: 'Petra', url: 'https://petra.app/' }, { name: 'Nightly', url: 'https://nightly.app/' }].map((option) => <Button className="w-full" variant="outline" key={option.name} disabled={wallet.isLoading} onClick={() => {
    if (!wallet.wallets.some((item) => item.name === option.name)) { window.open(option.url, '_blank', 'noopener,noreferrer'); return; }
    setError(null); setRequested(true); wallet.connect(option.name);
  }}>{option.name}</Button>)}{requested && wallet.connected && Number(wallet.network?.chainId) !== 1 && <Button onClick={async () => { try { await wallet.changeNetwork(Network.MAINNET); } catch (cause) { setError(cause instanceof Error ? cause.message : '네트워크 변경에 실패했습니다.'); } }}>Aptos 메인넷으로 변경</Button>}{error && <p role="alert">{error}</p>}</div>;
}
