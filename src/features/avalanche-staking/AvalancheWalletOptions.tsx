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
    catch (cause) { setError(cause instanceof Error ? cause.message : '연결 실패'); }
    finally { setPending(false); }
  }
  return <div className="space-y-3">{(['core', 'ledger', 'walletconnect'] as const).map((kind) => <Button className="w-full" key={kind} disabled={pending || (kind === 'walletconnect' && !WALLET_CONNECT_PROJECT_ID)} onClick={() => connect(kind)}>{kind === 'core' ? 'Core' : kind === 'ledger' ? 'Ledger' : 'WalletConnect (Core Mobile)'}</Button>)}<p className="text-xs text-muted-foreground">P-Chain 전용 연결입니다. Ledger는 Avalanche 앱과 첫 번째 계정(m/44′/9000′/0′/0/0)을 사용합니다.</p>{uri && <QRCodeSVG value={uri} size={220} />}{error && <p role="alert">{error}</p>}</div>;
}
