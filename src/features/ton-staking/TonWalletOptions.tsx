'use client';
import { useEffect, useState } from 'react';
import { useTonWallet, useTonConnectUI } from '@tonconnect/ui-react';
import { Button } from '@/components/ui/button';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
export function TonWalletOptions({ onConnected }: { onConnected: () => void }) {
  const wallet = useTonWallet();
  const [ui] = useTonConnectUI();
  const [requested, setRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setWalletType = useWalletTypeStore((state) => state.setWalletType);
  useEffect(() => { if (requested && wallet?.account.chain === '-239') { setWalletType('ton'); onConnected(); } }, [requested, wallet, setWalletType, onConnected]);
  return <div className="space-y-3">{[{ id: 'tonkeeper', label: 'Tonkeeper' }, { id: 'mytonwallet', label: 'MyTonWallet' }].map((option) => <Button key={option.id} className="w-full" variant="outline" onClick={async () => { setError(null); setRequested(true); try { await ui.openSingleWalletModal(option.id); } catch (cause) { setError(cause instanceof Error ? cause.message : 'TON 지갑 연결에 실패했습니다.'); } }}>{option.label}</Button>)}<p className="text-xs text-muted-foreground">TON Connect로 연결합니다.</p>{wallet && wallet.account.chain !== '-239' && <p role="alert">지갑에서 TON 메인넷으로 변경하세요.</p>}{error && <p role="alert" className="text-destructive">{error}</p>}</div>;
}
