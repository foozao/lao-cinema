'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

interface SaveSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onKeepEditing: () => void;
  onBackToList: () => void;
  backToListLabel?: string;
}

export function SaveSuccessModal({
  open,
  onOpenChange,
  title,
  description,
  onKeepEditing,
  onBackToList,
  backToListLabel = 'Back to List',
}: SaveSuccessModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <DialogTitle className="text-xl">{title}</DialogTitle>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 mt-4">
          <Button onClick={onKeepEditing} variant="outline" className="w-full">
            Keep Editing
          </Button>
          <Button onClick={onBackToList} className="w-full">
            {backToListLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
