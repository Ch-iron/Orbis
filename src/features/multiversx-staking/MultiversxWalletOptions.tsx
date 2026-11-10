'use client';
import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
import { connectMultiversxWallet, useMultiversxWallet } from './wallet';
export function MultiversxWalletOptions({ onConnected }: { onConnected: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uri = useMultiversxWallet((state) => state.uri);
  const lock = useRef(false);
  const setWalletType = useWalletTypeStore((state) => state.setWalletType);
  async function connect(kind: 'extension' | 'walletconnect') {
    if (lock.current) return;
    lock.current = true; setPending(true); setError(null);
    try { await connectMultiversxWallet(kind); setWalletType('multiversx'); onConnected(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Failed to connect the MultiversX wallet.'); }
    finally { lock.current = false; setPending(false); }
  }
  return <div className="space-y-3"><Button className="w-full" variant="outline" disabled={pending} onClick={() => connect('extension')}>MultiversX DeFi Wallet</Button>{['xPortal', 'WalletConnect'].map((label) => <Button className="w-full" variant="outline" key={label} disabled={pending || !process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID} onClick={() => connect('walletconnect')}>{label}</Button>)}<p className="text-xs text-muted-foreground">xPortal connects using WalletConnect.</p>{!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID && <p className="text-xs">WalletConnect configuration is required.</p>}{uri && <div className="space-y-2"><QRCodeSVG value={uri} size={220} /><a href={`https://xportal.com/wc?uri=${encodeURIComponent(uri)}`} className="underline">Open in xPortal</a></div>}{error && <p role="alert" className="text-destructive">{error}</p>}</div>;
}
