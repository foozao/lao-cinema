# Automatic Locale Detection

## Overview

The application automatically detects the user's preferred language and redirects them to the appropriate locale-specific URL.

## How It Works

### Non-Localized URLs

When a user visits a URL without a locale prefix (e.g., `/movies/the-signal`), the middleware:

1. Detects the user's preferred language from the browser's `Accept-Language` header
2. Redirects to the appropriate locale-specific URL

**Examples:**
- `/movies/the-signal` → `/en/movies/the-signal` (for English speakers)
- `/movies/the-signal` → `/lo/movies/the-signal` (for Lao speakers)

### Language Detection

The middleware parses the `Accept-Language` header and selects the best match:

```
Accept-Language: en-US,en;q=0.9,lo;q=0.8,th;q=0.7
```

Languages are prioritized by their quality value (q parameter).

### Thai → Lao Mapping

Since Thai and Lao are similar languages and share cultural context, Thai speakers are automatically redirected to the Lao locale:

- `th` (Thai) → `lo` (Lao)
- `th-TH` (Thai - Thailand) → `lo` (Lao)

This ensures Thai users get content in Lao rather than defaulting to English.

## Supported Locales

- **English** (`en`) - Default locale
- **Lao** (`lo`) - Includes Thai speakers

## Implementation Details

### Middleware (`/web/middleware.ts`)

The middleware handles:
1. Locale detection from `Accept-Language` header
2. Redirecting non-localized URLs to locale-specific URLs
3. Thai → Lao language mapping
4. Authentication (Basic Auth)

### URL Structure

**With locale prefix (standard):**
- `/en/movies`
- `/lo/movies`
- `/en/movies/the-signal`
- `/lo/movies/the-signal`

**Without locale prefix (auto-redirects):**
- `/movies` → `/en/movies` or `/lo/movies`
- `/movies/the-signal` → `/en/movies/the-signal` or `/lo/movies/the-signal`

### Redirect Behavior

- **302 Redirect**: Temporary redirect to locale-specific URL
- **Preserves query parameters**: `/movies?search=test` → `/en/movies?search=test`
- **Preserves hash fragments**: `/movies#top` → `/en/movies#top`

## User Experience

### First Visit
1. User visits `/movies/the-signal`
2. Browser sends `Accept-Language: th-TH,th;q=0.9,en;q=0.8`
3. Middleware detects Thai language
4. Maps Thai → Lao
5. Redirects to `/lo/movies/the-signal`

### Subsequent Visits
- Users can manually switch locales using the language selector
- The selected locale is stored in cookies by `next-intl`
- Future visits respect the user's chosen locale

## Configuration

### Adding New Locales

To add a new locale (e.g., Vietnamese):

1. **Update routing config** (`/web/i18n/routing.ts`):
```typescript
export const routing = defineRouting({
  locales: ['en', 'lo', 'vi'],
  defaultLocale: 'en',
  localePrefix: 'always'
});
```

2. **Update middleware** (`/web/middleware.ts`):
```typescript
function detectLocaleFromHeader(request: NextRequest): 'en' | 'lo' | 'vi' {
  // Add Vietnamese detection logic
  for (const lang of languages) {
    if (lang.code === 'vi') {
      return 'vi';
    }
    // ... existing logic
  }
}
```

3. **Add translation files**:
- `/web/messages/vi.json`

### Language Mapping

To map additional languages to existing locales, update the detection function:

```typescript
// Map Khmer to Lao
if (lang.code === 'lo' || lang.code === 'th' || lang.code === 'km') {
  return 'lo';
}
```

## Testing

### Test Different Languages

Use browser developer tools to override `Accept-Language`:

**Chrome DevTools:**
1. Open DevTools → Settings → Preferences
2. Find "Languages" section
3. Add/reorder languages
4. Reload page

**Firefox DevTools:**
1. Open DevTools → Network
2. Click on request → Headers
3. Edit "Accept-Language" header

### Test URLs

```bash
# Should redirect to /en/movies/the-signal
curl -H "Accept-Language: en-US" http://localhost:3000/movies/the-signal

# Should redirect to /lo/movies/the-signal
curl -H "Accept-Language: th-TH" http://localhost:3000/movies/the-signal

# Should redirect to /lo/movies/the-signal
curl -H "Accept-Language: lo-LA" http://localhost:3000/movies/the-signal
```

## SEO Considerations

### Canonical URLs

Always use locale-prefixed URLs in:
- Sitemaps
- Social media meta tags
- External links

### hreflang Tags

Add hreflang tags to indicate language alternatives:

```html
<link rel="alternate" hreflang="en" href="https://laocinema.com/en/movies/the-signal" />
<link rel="alternate" hreflang="lo" href="https://laocinema.com/lo/movies/the-signal" />
<link rel="alternate" hreflang="th" href="https://laocinema.com/lo/movies/the-signal" />
<link rel="alternate" hreflang="x-default" href="https://laocinema.com/en/movies/the-signal" />
```

## Benefits

1. **Better UX**: Users see content in their preferred language immediately
2. **SEO-friendly**: Locale-specific URLs are better for search engines
3. **Shareable**: URLs work for all users regardless of language preference
4. **Flexible**: Users can manually switch languages anytime
5. **Regional support**: Thai speakers get Lao content automatically

## Limitations

- Requires JavaScript-enabled browsers for full functionality
- First visit requires a redirect (minimal performance impact)
- Locale preference is stored in cookies (requires cookie consent in some regions)
