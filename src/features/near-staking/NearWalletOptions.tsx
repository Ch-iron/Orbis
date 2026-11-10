'use client';
import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
import { connectNearWallet, useNearWallet } from './wallet';
export function NearWalletOptions({ onConnected }: { onConnected: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uri = useNearWallet((state) => state.uri);
  const lock = useRef(false);
  const setWalletType = useWalletTypeStore((state) => state.setWalletType);
  async function connect(id: 'near-snap' | 'wallet-connect') {
    if (lock.current) return;
    lock.current = true; setPending(true); setError(null);
    try { await connectNearWallet(id); setWalletType('near'); onConnected(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Failed to connect the NEAR wallet.'); }
    finally { lock.current = false; setPending(false); }
  }
  return <div className="space-y-3"><Button className="w-full" variant="outline" disabled={pending} onClick={() => connect('near-snap')}>MetaMask · NEAR Snap</Button><Button className="w-full" variant="outline" disabled={pending || !process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID} onClick={() => connect('wallet-connect')}>WalletConnect</Button><p className="text-xs text-muted-foreground">Approve installation of NEAR Snap in MetaMask. This connects a NEAR account and does not use an EVM address.</p>{!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID && <p className="text-xs">WalletConnect configuration is required.</p>}{uri && <div className="space-y-2"><QRCodeSVG value={uri} size={220} /><a href={uri} className="underline">Open in Mobile Wallet</a></div>}{error && <p role="alert" className="text-destructive">{error}</p>}</div>;
}
