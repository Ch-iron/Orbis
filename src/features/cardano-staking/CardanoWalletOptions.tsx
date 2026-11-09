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
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Cardano 지갑 연결에 실패했습니다.'); }
    finally { lock.current = false; setPending(false); }
  }
  return <div className="space-y-3"><Button className="w-full" variant="outline" disabled={pending} onClick={() => connect('lace')}>Lace</Button><Button className="w-full" variant="outline" disabled={pending} onClick={() => connect('eternl')}>Eternl</Button><p className="text-xs text-muted-foreground">Cardano 메인넷 지갑의 CIP-30 연결을 사용합니다.</p>{error && <p role="alert" className="text-destructive">{error}</p>}</div>;
}
