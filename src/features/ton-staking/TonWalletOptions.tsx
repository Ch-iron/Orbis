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
  return <div className="space-y-3">{[{ id: 'tonkeeper', label: 'Tonkeeper' }, { id: 'mytonwallet', label: 'MyTonWallet' }].map((option) => <Button key={option.id} className="w-full" variant="outline" onClick={async () => { setError(null); setRequested(true); try { await ui.openSingleWalletModal(option.id); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Failed to connect the TON wallet.'); } }}>{option.label}</Button>)}<p className="text-xs text-muted-foreground">Connects using TON Connect.</p>{wallet && wallet.account.chain !== '-239' && <p role="alert">Switch to TON mainnet in your wallet.</p>}{error && <p role="alert" className="text-destructive">{error}</p>}</div>;
}
