'use client';

import { useState, useEffect, useRef } from 'react';
import { Film } from 'lucide-react';

interface CinematicLoaderProps {
  onComplete: () => void;
  minDuration?: number; // Minimum display time in ms
}

export function CinematicLoader({ onComplete, minDuration = 2200 }: CinematicLoaderProps) {
  const [fadeOut, setFadeOut] = useState(false);
  const [shouldShow, setShouldShow] = useState<boolean | null>(null); // null = checking
  const hasCalledComplete = useRef(false);

  // Check sessionStorage after mount to avoid hydration mismatch
  useEffect(() => {
    // Check for ?force-loader param to bypass sessionStorage (for testing)
    const urlParams = new URLSearchParams(window.location.search);
    const forceLoader = urlParams.has('force-loader');

    let hasSeenLoader = false;
    if (!forceLoader) {
      try {
        hasSeenLoader = sessionStorage.getItem('lao-cinema-loader-seen') === 'true';
      } catch {
        // sessionStorage unavailable
      }
    }

    if (hasSeenLoader) {
      // Already seen - skip loader
      setShouldShow(false);
      if (!hasCalledComplete.current) {
        hasCalledComplete.current = true;
        onComplete();
      }
      return;
    }

    // Show the loader
    setShouldShow(true);

    // Show loader for minimum duration, then fade out
    const timer = setTimeout(() => {
      setFadeOut(true);
      
      // Mark as seen
      try {
        sessionStorage.setItem('lao-cinema-loader-seen', 'true');
      } catch {
        // sessionStorage may be unavailable
      }
      
      // Wait for fade animation to complete before calling onComplete
      setTimeout(() => {
        if (!hasCalledComplete.current) {
          hasCalledComplete.current = true;
          onComplete();
        }
      }, 600);
    }, minDuration);

    return () => clearTimeout(timer);
  }, [onComplete, minDuration]);

  // While checking or if already seen, render nothing
  if (shouldShow !== true) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 bg-black flex items-center justify-center transition-opacity duration-500 ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center gap-6 animate-pulse-slow">
        {/* Logo */}
        <div className="relative">
          <Film className="w-20 h-20 text-amber-500" />
          <div className="absolute inset-0 animate-ping">
            <Film className="w-20 h-20 text-amber-500/30" />
          </div>
        </div>
        
        {/* Brand Name */}
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-wider">
          <span className="text-amber-500">Lao</span> Cinema
        </h1>
        
        {/* Loading bar */}
        <div className="w-48 h-1 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 animate-loading-bar" />
        </div>
      </div>
    </div>
  );
}
