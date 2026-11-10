'use client';

import type { ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { WalletButton } from '@/components/layout/WalletButton';
import { Button } from '@/components/ui/button';

type PoolStakeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  pending: boolean;
  children: ReactNode;
};

export function PoolStakeDialog({ open, onOpenChange, title, pending, children }: PoolStakeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!pending) onOpenChange(next); }}>
      <DialogContent showCloseButton={!pending} className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Review the staking conditions before confirming in your wallet.</DialogDescription>
        </DialogHeader>
        {!pending && <WalletButton />}
        <fieldset disabled={pending} className="min-w-0 space-y-4 py-4">{children}</fieldset>
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
