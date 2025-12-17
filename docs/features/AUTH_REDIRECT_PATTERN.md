# Authentication Redirect Pattern

This document describes the standardized pattern for handling authentication redirects with post-auth actions in the Lao Cinema platform.

## Problem Statement

When unauthenticated users attempt to perform actions that require authentication (e.g., subscribing to notifications, adding to watchlist, renting a movie), we want to:

1. **Show them what's available** before forcing authentication
2. **Provide context** on why authentication is needed
3. **Minimize friction** by returning them to the exact same page after auth
4. **Complete their intended action** automatically after successful authentication

## Solution: Redirect with Action Parameters

### Pattern Overview

```
User clicks feature → Modal explains need for auth → 
User authenticates → Returns to original page → 
Feature auto-triggers → URL cleaned up
```

### URL Parameter Convention

**Two parameters are used:**

1. **`redirect`** - The URL to return to after authentication
2. **Feature-specific action parameter** - Triggers the action after auth

**Naming Convention for Action Parameters:**

- Use a descriptive, feature-specific name (not generic terms like `action`)
- Prefix with `auto_` to indicate automatic behavior
- Use snake_case (lowercase with underscores)
- Examples: `auto_notify`, `auto_add_to_watchlist`, `auto_rent`

### Implementation Steps

#### 1. Component Setup

Import required hooks:

```typescript
import { usePathname, useSearchParams } from 'next/navigation';

const pathname = usePathname();
const searchParams = useSearchParams();
```

#### 2. Create Redirect URL

When showing auth prompt, construct redirect URL with action parameter:

```typescript
const redirectUrl = `${pathname}?auto_notify=true`;
```

#### 3. Auth Links

Pass redirect URL to login/register pages:

```typescript
<Link href={`/register?redirect=${encodeURIComponent(redirectUrl)}`}>
  <Button>Create Account</Button>
</Link>

<Link href={`/login?redirect=${encodeURIComponent(redirectUrl)}`}>
  <Button>Sign In</Button>
</Link>
```

#### 4. Post-Auth Action Handler

In the component's effect hook, check for the action parameter after authentication:

```typescript
useEffect(() => {
  if (!isAuthenticated) return;

  const checkAndTrigger = async () => {
    // Check if user was redirected here with action parameter
    const autoNotify = searchParams.get('auto_notify');
    
    if (autoNotify === 'true') {
      // Trigger the action
      await performNotificationSubscription();
      
      // Clean up URL (remove query parameter)
      window.history.replaceState({}, '', pathname);
    }
  };

  checkAndTrigger();
}, [isAuthenticated, pathname, searchParams]);
```

## Complete Example: NotifyMeButton

**File:** `/web/components/notify-me-button.tsx`

### Auth Modal with Redirect

```typescript
const AuthRequiredModal = () => {
  if (!showAuthModal) return null;
  
  // Create redirect URL with auto_notify parameter
  const redirectUrl = `${pathname}?auto_notify=true`;
  
  return (
    <div className="modal">
      <h3>Account Required</h3>
      <p>Create an account or login to get notified when this film becomes available.</p>
      
      <Link href={`/register?redirect=${encodeURIComponent(redirectUrl)}`}>
        <Button>Create Account</Button>
      </Link>
      
      <Link href={`/login?redirect=${encodeURIComponent(redirectUrl)}`}>
        <Button>Sign In</Button>
      </Link>
    </div>
  );
};
```

### Post-Auth Handler

```typescript
useEffect(() => {
  if (!isAuthenticated) {
    setIsChecking(false);
    return;
  }

  const checkSubscription = async () => {
    try {
      const data = await getNotificationStatus(movieId);
      setIsSubscribed(data.subscribed);
      
      // Check if user was redirected here with auto_notify parameter
      const autoNotify = searchParams.get('auto_notify');
      if (autoNotify === 'true' && !data.subscribed) {
        // Auto-subscribe after successful auth
        const newStatus = await toggleNotification(movieId, false);
        setIsSubscribed(newStatus);
        // Clean up URL
        window.history.replaceState({}, '', pathname);
      }
    } catch (error) {
      console.error('Failed to check notification status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  checkSubscription();
}, [movieId, isAuthenticated, pathname, searchParams]);
```

## Parameter Naming Guidelines

### ✅ Good Parameter Names

- `auto_notify` - Subscribes to movie notifications
- `auto_add_to_watchlist` - Adds movie to user's watchlist
- `auto_rent` - Initiates rental flow
- `auto_resume` - Resumes video playback
- `auto_follow` - Follows a person/studio

### ❌ Avoid Generic Names

- `action` - Too generic, likely to conflict
- `do` - Not descriptive
- `trigger` - Could mean anything
- `perform` - Vague

## Login/Register Page Implementation

The login and register pages must handle the `redirect` query parameter and pass it to their respective forms. This is a two-part implementation:

### Part 1: Page Component (Client Component)

The page content component reads the redirect parameter from the URL and passes it to the form:

**File:** `/web/app/[locale]/register/register-content.tsx`

```typescript
'use client';

import { useSearchParams } from 'next/navigation';
import { RegisterForm } from '@/components/auth/register-form';

export function RegisterPageContent() {
  const searchParams = useSearchParams();
  
  // Get redirect URL from query parameters
  const redirectTo = searchParams.get('redirect') || '/';

  return (
    <div>
      {/* ... */}
      <RegisterForm redirectTo={redirectTo} />
      {/* ... */}
    </div>
  );
}
```

**File:** `/web/app/[locale]/login/login-content.tsx`

```typescript
'use client';

import { useSearchParams } from 'next/navigation';
import { LoginForm } from '@/components/auth/login-form';

export function LoginPageContent() {
  const searchParams = useSearchParams();
  
  // Get redirect URL from query parameters
  const redirectTo = searchParams.get('redirect') || '/';

  return (
    <div>
      {/* ... */}
      <LoginForm redirectTo={redirectTo} />
      {/* ... */}
    </div>
  );
}
```

### Part 2: Form Components

The form components accept `redirectTo` as a prop and use it after successful authentication:

**File:** `/web/components/auth/register-form.tsx`

```typescript
interface RegisterFormProps {
  redirectTo?: string;
  onSuccess?: () => void;
}

export function RegisterForm({ redirectTo = '/', onSuccess }: RegisterFormProps) {
  const { register } = useAuth();
  const router = useRouter();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await register({ email, password, displayName });
      
      if (onSuccess) {
        onSuccess();
      } else {
        // Redirect to specified path (preserves query parameters)
        router.push(redirectTo);
      }
    } catch (err) {
      setError(err.message);
    }
  };
  
  // ... form JSX
}
```

**File:** `/web/components/auth/login-form.tsx`

```typescript
interface LoginFormProps {
  redirectTo?: string;
  onSuccess?: () => void;
}

export function LoginForm({ redirectTo = '/', onSuccess }: LoginFormProps) {
  const { login } = useAuth();
  const router = useRouter();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await login({ email, password });
      
      if (onSuccess) {
        onSuccess();
      } else {
        // Redirect to specified path (preserves query parameters)
        router.push(redirectTo);
      }
    } catch (err) {
      setError(err.message);
    }
  };
  
  // ... form JSX
}
```

### Key Points

1. **Query parameter handling** - Page components use `useSearchParams()` to read the `redirect` parameter
2. **Default fallback** - If no redirect is specified, defaults to `'/'` (home page)
3. **Preserved parameters** - The redirect URL is passed as-is, preserving any query parameters (like `auto_notify`)
4. **Prop-based** - Forms are reusable and accept `redirectTo` as a prop, making them flexible for different use cases
5. **Optional callback** - Forms also support an `onSuccess` callback for custom post-auth behavior

## URL Cleanup

Always clean up the URL after triggering the action to avoid:

- Accidentally re-triggering on page refresh
- Ugly URLs with action parameters visible
- State confusion if user shares the URL

```typescript
window.history.replaceState({}, '', pathname);
```

## Current Implementations

### NotifyMeButton (`/web/components/notify-me-button.tsx`)

- **Parameter:** `auto_notify=true`
- **Action:** Subscribes user to movie notifications
- **Used on:** Movie detail pages (unavailable/coming soon films)

## Future Candidates

Features that could benefit from this pattern:

1. **WatchlistButton** - `auto_add_to_watchlist=true`
2. **Rental flow** - `auto_rent=true&movie_id=123`
3. **Share with comment** - `auto_share=true&comment=encoded`
4. **Follow person/studio** - `auto_follow=true&person_id=123`
5. **Resume playback** - `auto_resume=true&timestamp=120`

## Best Practices

1. **Always encode the redirect URL** - Use `encodeURIComponent()` to avoid URL parsing issues
2. **Use boolean values** - `?auto_notify=true` is clearer than `?auto_notify=1` or `?auto_notify`
3. **Use snake_case** - All URL parameters should use lowercase with underscores
4. **Check existing state** - Don't trigger if action already completed (e.g., already subscribed)
5. **Clean up URL** - Remove parameters after successful action
6. **Handle errors gracefully** - If auto-action fails, show UI for manual retry
7. **Feature-specific naming** - Use descriptive parameter names to avoid conflicts

## Security Considerations

1. **Server-side validation** - Always validate user permissions on the backend
2. **CSRF protection** - Ensure auth endpoints have proper CSRF tokens
3. **Redirect validation** - Validate redirect URLs to prevent open redirects
4. **Rate limiting** - Protect auto-actions from abuse with rate limiting

## Testing Checklist

When implementing this pattern:

- [ ] Unauthenticated user sees feature prompt
- [ ] Auth modal explains why account is needed
- [ ] User can create account or sign in
- [ ] After auth, returns to correct page
- [ ] Action triggers automatically
- [ ] URL is cleaned up after action
- [ ] Page refresh doesn't re-trigger action
- [ ] Works with both login and register flows
- [ ] Error handling works if action fails
- [ ] Manual trigger still works if auto-trigger fails
