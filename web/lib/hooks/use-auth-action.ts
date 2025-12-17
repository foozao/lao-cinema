import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';

interface UseAuthActionOptions {
  /**
   * The URL parameter name to check for (e.g., 'auto_notify', 'auto_add_to_watchlist')
   */
  parameterName: string;
  
  /**
   * Function to check if the action is already completed
   * Returns true if action should be triggered
   */
  shouldTrigger: () => Promise<boolean> | boolean;
  
  /**
   * The action to perform after successful authentication
   */
  onTrigger: () => Promise<void> | void;
  
  /**
   * Optional callback when action completes successfully
   */
  onComplete?: () => void;
  
  /**
   * Optional callback when action fails
   */
  onError?: (error: Error) => void;
}

/**
 * Shared hook for handling auth-required actions with redirect pattern
 * 
 * This hook implements the standard auth redirect pattern:
 * 1. User clicks action button while logged out
 * 2. Modal shows explaining need for auth
 * 3. After login/register, redirects back with parameter
 * 4. Hook detects parameter and auto-triggers action
 * 5. Cleans up URL after completion
 * 
 * @example
 * ```tsx
 * const { redirectUrl, hasTriggered } = useAuthAction({
 *   parameterName: 'auto_notify',
 *   shouldTrigger: async () => {
 *     const status = await getNotificationStatus(movieId);
 *     return !status.subscribed;
 *   },
 *   onTrigger: async () => {
 *     await subscribeToMovie(movieId);
 *   },
 * });
 * ```
 */
export function useAuthAction({
  parameterName,
  shouldTrigger,
  onTrigger,
  onComplete,
  onError,
}: UseAuthActionOptions) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const hasTriggered = useRef(false);

  // Create redirect URL with the action parameter
  const redirectUrl = `${pathname}?${parameterName}=true`;

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const handleAutoAction = async () => {
      try {
        // Check if parameter is present
        const autoAction = searchParams.get(parameterName);
        if (autoAction !== 'true') {
          return;
        }

        // Prevent duplicate executions in React Strict Mode
        if (hasTriggered.current) {
          return;
        }

        // Check if action should be triggered
        const should = await shouldTrigger();
        if (!should) {
          // Action already completed or not needed, just clean up URL
          window.history.replaceState({}, '', pathname);
          return;
        }

        // Mark as triggered before executing to prevent duplicates
        hasTriggered.current = true;

        // Execute the action
        await onTrigger();

        // Clean up URL
        window.history.replaceState({}, '', pathname);

        // Call completion callback
        onComplete?.();
      } catch (error) {
        console.error(`Failed to execute auto-action (${parameterName}):`, error);
        onError?.(error as Error);
      }
    };

    handleAutoAction();
  }, [isAuthenticated, pathname, searchParams, parameterName, shouldTrigger, onTrigger, onComplete, onError]);

  return {
    redirectUrl,
    hasTriggered: hasTriggered.current,
  };
}
