'use client';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { connectCardanoWallet } from './wallet';
export function CardanoWalletOptions({ onConnected }: { onConnected: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  async function connect(name: 'lace' | 'eternl') {
    if (lock.current) return;
    lock.current = true; setPending(true); setError(null);
    try { await connectCardanoWallet(name); onConnected(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Failed to connect the Cardano wallet.'); }
    finally { lock.current = false; setPending(false); }
  }
  return <div className="space-y-3"><Button className="w-full" variant="outline" disabled={pending} onClick={() => connect('lace')}>Lace</Button><Button className="w-full" variant="outline" disabled={pending} onClick={() => connect('eternl')}>Eternl</Button><p className="text-xs text-muted-foreground">Uses a CIP-30 connection to a Cardano mainnet wallet.</p>{error && <p role="alert" className="text-destructive">{error}</p>}</div>;
}
