'use client';

import { NextIntlLink } from '@/i18n/routing';
import { useProgressBar } from './progress-bar';
import { ComponentProps } from 'react';

type LinkProps = ComponentProps<typeof NextIntlLink>;

/**
 * Enhanced Link component that triggers progress bar immediately on click
 * Provides instant visual feedback before navigation begins
 */
export function AnimatedLink({ 
  onClick, 
  ...props 
}: LinkProps) {
  const { start } = useProgressBar();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Start progress bar immediately on click
    start();
    
    // Call original onClick if provided
    onClick?.(e);
  };

  return <NextIntlLink onClick={handleClick} {...props} />;
}
