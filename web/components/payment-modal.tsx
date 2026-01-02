'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/lib/auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, QrCode, CheckCircle, UserPlus, Check } from 'lucide-react';

export type PaymentReason = 'default' | 'rental_required' | 'rental_expired';

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movieTitle: string;
  onPaymentComplete: (promoCode?: string) => void;
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
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  const isAnonymous = !user;

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
    setHasError(false);
    
    // Simulate payment processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    setIsProcessing(false);
    
    try {
      // Try to complete the rental with DEMOCOUPON promo code
      // This will use the free payment provider on the backend
      await onPaymentComplete('DEMOCOUPON');
      
      // Only mark as complete if successful
      setIsComplete(true);
      
      // Brief delay to show success state before modal closes/redirects
      await new Promise((resolve) => setTimeout(resolve, 800));
    } catch (error) {
      // Payment/rental creation failed
      setHasError(true);
      console.error('Payment completion failed:', error);
    }
  };

  const handleClose = (open: boolean) => {
    if (!isProcessing) {
      // Reset state when closing
      setIsComplete(false);
      setHasError(false);
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
          {/* Account Creation Prompt for Anonymous Users */}
          {isAnonymous && (
            <div className="w-full bg-gradient-to-br from-blue-900/40 to-purple-900/40 border border-blue-700/50 rounded-lg p-4 space-y-4">
              <Link href="/profile">
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0"
                  onClick={() => onOpenChange(false)}
                >
                  <UserPlus className="w-4 h-4" />
                  Create Free Account
                </Button>
              </Link>
              
              <ul className="space-y-2 text-sm text-gray-300 mt-6">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Watch on multiple devices</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Sync watch progress across devices</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>View rental history</span>
                </li>
              </ul>
              
              <p className="text-xs text-gray-400 text-center">
                Or continue as guest below
              </p>
            </div>
          )}

          {/* QR Code */}
          <div className="bg-white p-4 rounded-lg">
            <QRCodeSVG
              value={qrCodeUrl}
              size={160}
              level="H"
              includeMargin={false}
              className="w-32 h-32 sm:w-40 sm:h-40"
            />
          </div>

          {/* Instructions */}
          <p className="text-sm text-gray-400 text-center max-w-xs">
            {t('scanInstructions')}
          </p>

          {/* Success State */}
          {isComplete && !hasError && (
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">{t('paymentSuccess')}</span>
            </div>
          )}
          
          {/* Error State */}
          {hasError && (
            <div className="w-full bg-red-900/30 border border-red-700/50 rounded-lg p-4">
              <p className="text-sm text-red-300 text-center">
                The alert displayed explains the issue. Please close this window and try another film.
              </p>
            </div>
          )}

          {/* Emulate Payment Button */}
          <Button
            onClick={hasError ? () => handleClose(false) : handleEmulatePayment}
            disabled={isProcessing || isComplete}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('processing')}
              </>
            ) : isComplete && !hasError ? (
              <>
                <CheckCircle className="w-4 h-4" />
                {t('complete')}
              </>
            ) : hasError ? (
              'Close'
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
