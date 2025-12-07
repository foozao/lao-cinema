'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface CastErrorNotificationProps {
  error: string | null;
  onDismiss?: () => void;
}

export function CastErrorNotification({ error, onDismiss }: CastErrorNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (error) {
      setIsVisible(true);
      
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          onDismiss?.();
        }, 300); // Wait for fade animation
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [error, onDismiss]);

  if (!error) return null;

  return (
    <div
      className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      <div className="bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] max-w-[500px]">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm font-medium flex-1">{error}</p>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => {
              onDismiss?.();
            }, 300);
          }}
          className="flex-shrink-0 hover:bg-red-700 rounded p-1 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
