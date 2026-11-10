'use client';
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { WALLET_CONNECT_PROJECT_ID } from '@/lib/wallet/constants';
import { connectAvalancheWallet, useAvalancheWallet } from './wallet';
export function AvalancheWalletOptions({ onConnected }: { onConnected: () => void }) {
  const uri = useAvalancheWallet((state) => state.uri);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function connect(kind: 'core' | 'ledger' | 'walletconnect') {
    setPending(true); setError(null);
    try { await connectAvalancheWallet(kind); onConnected(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Connection failed'); }
    finally { setPending(false); }
  }
  return <div className="space-y-3">{(['core', 'ledger', 'walletconnect'] as const).map((kind) => <Button className="w-full" key={kind} disabled={pending || (kind === 'walletconnect' && !WALLET_CONNECT_PROJECT_ID)} onClick={() => connect(kind)}>{kind === 'core' ? 'Core' : kind === 'ledger' ? 'Ledger' : 'WalletConnect (Core Mobile)'}</Button>)}<p className="text-xs text-muted-foreground">P-Chain connections only. Ledger uses the Avalanche app and the first account (m/44′/9000′/0′/0/0).</p>{uri && <QRCodeSVG value={uri} size={220} />}{error && <p role="alert">{error}</p>}</div>;
}
