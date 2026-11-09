'use client';

import { useRef, useState } from 'react';
import { useChain } from '@cosmos-kit/react';
import { Button } from '@/components/ui/button';
import { WALLET_CONNECT_PROJECT_ID } from '@/lib/wallet/constants';
import { useWalletTypeStore } from '@/stores/walletTypeStore';

const OPTIONS = [
  { name: 'keplr-extension', label: 'Keplr' },
  { name: 'cosmostation-extension', label: 'Cosmostation' },
  { name: 'keplr-mobile', label: 'WalletConnect (Keplr Mobile)' },
];

export function NativeCosmosWalletOptions({ chainName, onConnected }: { chainName: string; onConnected: () => void }) {
  const { walletRepo } = useChain(chainName, false);
  const setWalletType = useWalletTypeStore((state) => state.setWalletType);
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect(name: string) {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError(null);
    try {
      await walletRepo.connect(name, false);
      const current = walletRepo.current;
      if (!current?.isWalletConnected || current.walletName !== name || !current.address) throw new Error('Wallet connection was not completed.');
      setWalletType('native-cosmos');
      onConnected();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Wallet connection failed.');
    } finally {
      lock.current = false;
      setPending(false);
    }
  }

  return <div className="flex flex-col gap-2">
    {OPTIONS.map((option) => <Button key={option.name} variant="outline" disabled={pending || (option.name === 'keplr-mobile' && !WALLET_CONNECT_PROJECT_ID)} onClick={() => void connect(option.name)}>{option.label}</Button>)}
    {pending && <p role="status">Confirm the connection in your wallet.</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}
