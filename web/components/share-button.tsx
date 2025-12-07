'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Check } from 'lucide-react';

interface ShareButtonProps {
  /**
   * The path to share (without locale prefix)
   * Example: "/movies/the-signal" or "/movies/123"
   */
  path: string;
  
  /**
   * Title for the share (used in native share dialog)
   */
  title?: string;
  
  /**
   * Description for the share (used in native share dialog)
   */
  description?: string;
  
  /**
   * Button variant
   */
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  
  /**
   * Button size
   */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  
  /**
   * Show text label or icon only
   */
  showLabel?: boolean;
  
  /**
   * Custom class name
   */
  className?: string;
}

export function ShareButton({
  path,
  title = 'Check this out',
  description,
  variant = 'outline',
  size = 'default',
  showLabel = true,
  className,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Get the full URL without locale prefix
  const getShareUrl = () => {
    if (typeof window === 'undefined') return '';
    const { protocol, host } = window.location;
    return `${protocol}//${host}${path}`;
  };

  const shareUrl = getShareUrl();

  // Check if native share is available
  const hasNativeShare = typeof navigator !== 'undefined' && navigator.share;

  // Handle share/copy
  const handleShare = async () => {
    // Try native share first (mobile)
    if (hasNativeShare) {
      try {
        await navigator.share({
          title,
          text: description,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // User cancelled or not supported, fall through to copy
        if ((err as Error).name === 'AbortError') {
          return; // User cancelled, don't copy
        }
      }
    }

    // Fallback to copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setShowTooltip(true);
      setTimeout(() => {
        setCopied(false);
        setShowTooltip(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback: show URL in alert
      alert(`Copy this link:\n${shareUrl}`);
    }
  };

  return (
    <div className="relative inline-block">
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleShare}
        onMouseEnter={() => !copied && setShowTooltip(true)}
        onMouseLeave={() => !copied && setShowTooltip(false)}
      >
        {copied ? (
          <>
            <Check className={showLabel ? 'mr-2 h-4 w-4' : 'h-4 w-4'} />
            {showLabel && 'Copied!'}
          </>
        ) : (
          <>
            <Share2 className={showLabel ? 'mr-2 h-4 w-4' : 'h-4 w-4'} />
            {showLabel && 'Share'}
          </>
        )}
      </Button>
      
      {/* Tooltip */}
      {showTooltip && !copied && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded shadow-lg whitespace-nowrap z-50">
          {hasNativeShare ? 'Share this page' : 'Copy link to clipboard'}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
          </div>
        </div>
      )}
    </div>
  );
}
