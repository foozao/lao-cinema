/**
 * Rate Limiter
 * 
 * In-memory rate limiting for authentication endpoints.
 * Prevents brute-force attacks and abuse.
 * 
 * For production with multiple servers, consider using Redis.
 */

export interface RateLimitConfig {
  maxAttempts: number;
  windowMinutes: number;
}

interface RateLimitEntry {
  attempts: number;
  expiresAt: Date;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

setInterval(() => {
  cleanupExpiredEntries();
}, CLEANUP_INTERVAL_MS);

export const RATE_LIMITS = {
  LOGIN: {
    maxAttempts: 5,
    windowMinutes: 15,
  },
  FORGOT_PASSWORD: {
    maxAttempts: 3,
    windowMinutes: 15,
  },
  VIDEO_TOKEN: {
    maxAttempts: 30,
    windowMinutes: 1,
  },
} as const;

function cleanupExpiredEntries(): void {
  const now = new Date();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.expiresAt) {
      rateLimitStore.delete(key);
    }
  }
}

function getRateLimitKey(type: 'login' | 'forgot-password' | 'video-token', identifier: string): string {
  return `${type}:${identifier}`;
}

export function checkRateLimit(
  type: 'login' | 'forgot-password' | 'video-token',
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; retryAfter?: Date } {
  const key = getRateLimitKey(type, identifier);
  const entry = rateLimitStore.get(key);
  const now = new Date();

  if (!entry || now > entry.expiresAt) {
    return { allowed: true };
  }

  if (entry.attempts >= config.maxAttempts) {
    return {
      allowed: false,
      retryAfter: entry.expiresAt,
    };
  }

  return { allowed: true };
}

export function recordAttempt(
  type: 'login' | 'forgot-password' | 'video-token',
  identifier: string,
  config: RateLimitConfig
): void {
  const key = getRateLimitKey(type, identifier);
  const now = new Date();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.expiresAt) {
    rateLimitStore.set(key, {
      attempts: 1,
      expiresAt: new Date(now.getTime() + config.windowMinutes * 60 * 1000),
    });
  } else {
    entry.attempts += 1;
  }
}

export function resetRateLimit(type: 'login' | 'forgot-password' | 'video-token', identifier: string): void {
  const key = getRateLimitKey(type, identifier);
  rateLimitStore.delete(key);
}

export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}
