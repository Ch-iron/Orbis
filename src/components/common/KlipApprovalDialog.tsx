'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, ExternalLink, X, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useKlipRequestStore } from '@/stores/klipRequestStore';
import { getKlipDeepLink } from '@/lib/wallet/klip';

const KlipApprovalDialog = () => {
  const requestKey = useKlipRequestStore((state) => state.requestKey);
  const requestType = useKlipRequestStore((state) => state.requestType);
  const clearRequest = useKlipRequestStore((state) => state.clearRequest);

  const isOpen = !!requestKey;
  const deepLink = requestKey ? getKlipDeepLink(requestKey) : '';

  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }, []);

  const titleText = requestType === 'auth' ? 'Klip 지갑 연결' : 'Klip 트랜잭션 승인';
  const descriptionText = requestType === 'auth'
    ? 'Klip 앱에서 연결 요청을 승인해주세요.'
    : 'Klip 앱에서 트랜잭션을 승인해주세요.';

  // Auto-open deep link on mobile
  useEffect(() => {
    if (isOpen && isMobile && deepLink) {
      window.location.href = deepLink;
    }
  }, [isOpen, isMobile, deepLink]);

  // clearRequest() stops the polling loop in pollForResult (checks store state each iteration)
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      clearRequest();
    }
  }, [clearRequest]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{titleText}</DialogTitle>
          <DialogDescription>{descriptionText}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          {isMobile ? (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Smartphone className="h-8 w-8 text-muted-foreground" />
              </div>
              <Button
                className="w-full gap-2"
                onClick={() => { window.location.href = deepLink; }}
              >
                <ExternalLink className="h-4 w-4" />
                Klip 열기
              </Button>
            </>
          ) : (
            <div className="flex w-full flex-col items-center gap-4">
              <div className="rounded-xl border bg-white p-3">
                <QRCodeSVG
                  value={deepLink}
                  size={200}
                  level="M"
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Klip 앱에서 QR 코드를 스캔해주세요
              </div>
            </div>
          )}

          <Button
            variant="ghost"
            className="w-full gap-2"
            onClick={clearRequest}
          >
            <X className="h-4 w-4" />
            취소
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { KlipApprovalDialog };
