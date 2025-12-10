'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

interface ProgressBarContextType {
  start: () => void;
}

const ProgressBarContext = createContext<ProgressBarContextType | null>(null);

export function useProgressBar() {
  const context = useContext(ProgressBarContext);
  if (!context) {
    throw new Error('useProgressBar must be used within ProgressBarProvider');
  }
  return context;
}

export function ProgressBarProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isAnimating, setIsAnimating] = useState(false);

  // Manual trigger for link clicks
  const start = useCallback(() => {
    setIsAnimating(true);
    
    const timer = setTimeout(() => {
      setIsAnimating(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  // Auto-trigger on route change (for browser back/forward)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    start();
  }, [pathname, searchParams, start]);

  return (
    <ProgressBarContext.Provider value={{ start }}>
      {children}
      <div
        className={`fixed top-0 left-0 h-[3px] bg-red-500 z-[9999] transition-all duration-300 ${
          isAnimating ? 'route-progress-bar-active' : 'w-0 opacity-0'
        }`}
        style={{
          boxShadow: isAnimating ? '0 0 10px #ef4444, 0 0 5px #ef4444' : 'none',
        }}
      />
    </ProgressBarContext.Provider>
  );
}
