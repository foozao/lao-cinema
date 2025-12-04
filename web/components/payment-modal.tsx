'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, QrCode, CheckCircle } from 'lucide-react';

export type PaymentReason = 'default' | 'rental_required' | 'rental_expired';

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movieTitle: string;
  onPaymentComplete: () => void;
  /** Reason for showing the modal - affects the description text */
  reason?: PaymentReason;
}

/**
 * Payment modal for demo QR payment flow.
 * 
 * EXTENSIBILITY:
 * - Replace QR URL with actual payment gateway URL
 * - Add real payment status polling
 * - Support multiple payment methods
 * - Integrate with backend payment webhooks
 */
export function PaymentModal({
  open,
  onOpenChange,
  movieTitle,
  onPaymentComplete,
  reason = 'default',
}: PaymentModalProps) {
  const t = useTranslations('payment');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // QR code destination URL
  // TODO: Replace with actual payment gateway URL in production
  const qrCodeUrl = 'https://en.wikipedia.org/wiki/Cinema_of_Laos';

  // Get context-aware description based on reason
  const getDescription = () => {
    switch (reason) {
      case 'rental_required':
        return t('descriptionRequired', { movie: movieTitle });
      case 'rental_expired':
        return t('descriptionExpired', { movie: movieTitle });
      default:
        return t('description', { movie: movieTitle });
    }
  };

  const handleEmulatePayment = async () => {
    setIsProcessing(true);
    
    // Simulate payment processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    setIsProcessing(false);
    setIsComplete(true);
    
    // Brief delay to show success state before redirecting
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    onPaymentComplete();
  };

  const handleClose = (open: boolean) => {
    if (!isProcessing) {
      // Reset state when closing
      setIsComplete(false);
      onOpenChange(open);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <QrCode className="w-5 h-5 text-red-500" />
            {t('title')}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {getDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center py-6 space-y-6">
          {/* QR Code */}
          <div className="bg-white p-4 rounded-lg">
            <QRCodeSVG
              value={qrCodeUrl}
              size={200}
              level="H"
              includeMargin={false}
            />
          </div>

          {/* Instructions */}
          <p className="text-sm text-gray-400 text-center max-w-xs">
            {t('scanInstructions')}
          </p>

          {/* Success State */}
          {isComplete && (
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">{t('paymentSuccess')}</span>
            </div>
          )}

          {/* Emulate Payment Button */}
          <Button
            onClick={handleEmulatePayment}
            disabled={isProcessing || isComplete}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('processing')}
              </>
            ) : isComplete ? (
              <>
                <CheckCircle className="w-4 h-4" />
                {t('complete')}
              </>
            ) : (
              t('emulatePayment')
            )}
          </Button>

          {/* Demo Notice */}
          <p className="text-xs text-gray-500 text-center">
            {t('demoNotice')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
