'use client';

import { LucideIcon } from 'lucide-react';
import { X, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';

interface AuthRequiredModalProps {
  /**
   * Whether the modal is visible
   */
  isOpen: boolean;
  
  /**
   * Function to close the modal
   */
  onClose: () => void;
  
  /**
   * The redirect URL to pass to login/register pages
   */
  redirectUrl: string;
  
  /**
   * Icon to display in the modal
   */
  icon: LucideIcon;
  
  /**
   * Icon color classes (e.g., 'text-blue-400')
   */
  iconColor: string;
  
  /**
   * Background color for icon container (e.g., 'bg-blue-500/20')
   */
  iconBgColor: string;
  
  /**
   * Modal heading text
   */
  title: string;
  
  /**
   * Modal description/message text
   */
  message: string;
  
  /**
   * Text for "Create Account" button
   */
  createAccountText: string;
  
  /**
   * Text for "Sign In" button
   */
  signInText: string;
}

/**
 * Reusable authentication required modal
 * 
 * Shows when a user attempts an action that requires authentication.
 * Provides login and register options with redirect to return to the original page.
 * 
 * @example
 * ```tsx
 * <AuthRequiredModal
 *   isOpen={showAuthModal}
 *   onClose={() => setShowAuthModal(false)}
 *   redirectUrl={redirectUrl}
 *   icon={Bell}
 *   iconColor="text-blue-400"
 *   iconBgColor="bg-blue-500/20"
 *   title={t('authRequired')}
 *   message={t('authRequiredMessage')}
 *   createAccountText={t('createAccount')}
 *   signInText={t('signIn')}
 * />
 * ```
 */
export function AuthRequiredModal({
  isOpen,
  onClose,
  redirectUrl,
  icon: Icon,
  iconColor,
  iconBgColor,
  title,
  message,
  createAccountText,
  signInText,
}: AuthRequiredModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        // Close if clicking outside modal (on padding area)
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Backdrop - purely visual, doesn't intercept events */}
      <div className="absolute inset-0 bg-black/70 pointer-events-none" />
      
      {/* Modal */}
      <div 
        className="relative bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex items-start gap-4">
          <div className={`p-3 ${iconBgColor} rounded-full`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">
              {title}
            </h3>
            <p className="text-gray-300 text-sm mb-4">
              {message}
            </p>
            
            <div className="flex flex-col gap-2">
              <Link href={`/register?redirect=${encodeURIComponent(redirectUrl)}`} className="w-full">
                <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                  <UserPlus className="w-4 h-4" />
                  {createAccountText}
                </Button>
              </Link>
              <Link href={`/login?redirect=${encodeURIComponent(redirectUrl)}`} className="w-full">
                <Button variant="outline" className="w-full border-gray-500 bg-transparent text-gray-200 hover:text-white hover:bg-gray-800 hover:border-gray-400">
                  {signInText}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
