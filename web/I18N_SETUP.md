# Internationalization (i18n) Setup

This document explains how to **implement** internationalization in Lao Cinema using `next-intl`.

For the **architecture** and why we use a dual-system approach, see [`docs/architecture/LANGUAGE_SYSTEM.md`](../docs/architecture/LANGUAGE_SYSTEM.md).

## Overview

The app uses **URL-based routing** for optimal SEO:
- English: `https://laocinema.com/en/...`
- Lao: `https://laocinema.com/lo/...`

Each language version can be indexed separately by search engines, improving discoverability for both English and Lao-speaking audiences.

## Two Translation Systems

**Quick Reference:**

| System | Purpose | Where | Example |
|--------|---------|-------|---------|
| **next-intl** | UI text | `messages/*.json` | Buttons, labels, headings |
| **LocalizedText** | Content data | Database | Movie titles, descriptions |

See [LANGUAGE_SYSTEM.md](../docs/architecture/LANGUAGE_SYSTEM.md) for architectural details.

### File Structure

```
/web
├── i18n/
│   ├── request.ts          # next-intl configuration
│   └── routing.ts          # Routing configuration & navigation helpers
├── messages/
│   ├── en.json             # English UI translations
│   └── lo.json             # Lao UI translations
├── middleware.ts           # Handles locale detection & routing
├── app/
│   ├── layout.tsx          # Root layout (minimal)
│   ├── page.tsx            # Redirects to /en
│   └── [locale]/           # All pages go here
│       ├── layout.tsx      # Locale-specific layout
│       ├── page.tsx        # Home page
│       └── movies/
│           └── [id]/
│               └── page.tsx
```

## Usage

### 1. Using Translations in Components

```typescript
'use client';

import { useTranslations, useLocale } from 'next-intl';

export function MyComponent() {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <div>
      <h1>{t('home.title')}</h1>
      <p>{t('home.tagline')}</p>
      <p>Current locale: {locale}</p>
    </div>
  );
}
```

### 2. Using Translations with Namespaces

```typescript
const t = useTranslations('movie');

// Access nested keys
<p>{t('cast')}</p>        // "Cast" or "ນັກສະແດງ"
<p>{t('crew')}</p>        // "Crew" or "ທີມງານ"
```

### 3. Using Translations with Variables

```typescript
// In messages/en.json: "minutes": "{count} minutes"
// In messages/lo.json: "minutes": "{count} ນາທີ"

<p>{t('movie.minutes', { count: 120 })}</p>
// English: "120 minutes"
// Lao: "120 ນາທີ"
```

### 4. Using LocalizedText for Content

```typescript
import { useLocale } from 'next-intl';
import { getLocalizedText } from '@/lib/i18n';

export function MovieCard({ movie }: { movie: Movie }) {
  const locale = useLocale() as 'en' | 'lo';
  
  // Get localized content from database
  const title = getLocalizedText(movie.title, locale);
  const overview = getLocalizedText(movie.overview, locale);

  return (
    <div>
      <h2>{title}</h2>
      <p>{overview}</p>
    </div>
  );
}
```

### 5. Navigation with Localized Links

```typescript
import { Link } from '@/i18n/routing';

// Automatically uses current locale
<Link href="/movies/123">View Movie</Link>

// In English: navigates to /en/movies/123
// In Lao: navigates to /lo/movies/123
```

### 6. Programmatic Navigation

```typescript
import { useRouter, usePathname } from '@/i18n/routing';

export function MyComponent() {
  const router = useRouter();
  const pathname = usePathname();

  const switchLanguage = (newLocale: 'en' | 'lo') => {
    // Stays on same page, just changes locale
    router.replace(pathname, { locale: newLocale });
  };

  return <button onClick={() => switchLanguage('lo')}>ລາວ</button>;
}
```

## Adding New Translations

### 1. Add to JSON Files

**messages/en.json:**
```json
{
  "myFeature": {
    "title": "My Feature",
    "description": "This is a new feature"
  }
}
```

**messages/lo.json:**
```json
{
  "myFeature": {
    "title": "ຄຸນສົມບັດຂອງຂ້ອຍ",
    "description": "ນີ້ແມ່ນຄຸນສົມບັດໃໝ່"
  }
}
```

### 2. Use in Component

```typescript
const t = useTranslations('myFeature');

<h1>{t('title')}</h1>
<p>{t('description')}</p>
```

## Adding New Languages

To add Thai, Vietnamese, or other languages:

### 1. Update Routing Config

**i18n/routing.ts:**
```typescript
export const routing = defineRouting({
  locales: ['en', 'lo', 'th', 'vi'],  // Add new locales
  defaultLocale: 'en',
  localePrefix: 'always'
});
```

### 2. Create Translation File

Create `messages/th.json` or `messages/vi.json` with all translations.

### 3. Update Types

**lib/types.ts:**
```typescript
export type Language = 'en' | 'lo' | 'th' | 'vi';

export interface LocalizedText {
  en: string;
  lo?: string;
  th?: string;
  vi?: string;
}
```

### 4. Update Middleware

**middleware.ts:**
```typescript
export const config = {
  matcher: ['/', '/(lo|en|th|vi)/:path*']  // Add new locales
};
```

## SEO Benefits

### Automatic hreflang Tags

next-intl automatically generates proper hreflang tags:

```html
<link rel="alternate" hreflang="en" href="https://laocinema.com/en/movies/the-river" />
<link rel="alternate" hreflang="lo" href="https://laocinema.com/lo/movies/ແມ່ນ້ຳ" />
<link rel="alternate" hreflang="x-default" href="https://laocinema.com/en/movies/the-river" />
```

### Language-Specific Indexing

- Google can index `/en/` and `/lo/` pages separately
- Lao searches will find `/lo/` pages
- English searches will find `/en/` pages
- No duplicate content penalties

### Shareable URLs

Users can share language-specific links:
- `https://laocinema.com/en/movies/123` → Always English
- `https://laocinema.com/lo/movies/123` → Always Lao

## Best Practices

### 1. Always Use Translation Keys

❌ **Don't:**
```typescript
<h1>Featured Films</h1>
```

✅ **Do:**
```typescript
<h1>{t('home.featured')}</h1>
```

### 2. Use Proper Navigation Components

❌ **Don't:**
```typescript
import Link from 'next/link';
<Link href="/movies">Movies</Link>
```

✅ **Do:**
```typescript
import { Link } from '@/i18n/routing';
<Link href="/movies">Movies</Link>
```

### 3. Separate UI Text from Content

❌ **Don't:**
```typescript
// Mixing UI text and content
const title = t('movie.title');  // Wrong - movie titles come from database
```

✅ **Do:**
```typescript
// UI text from translations
const label = t('movie.cast');

// Content from database
const title = getLocalizedText(movie.title, locale);
```

### 4. Provide Fallbacks

Always provide English as fallback:

```typescript
export function createLocalizedText(en: string, lo?: string): LocalizedText {
  return { en, lo };
}
```

## Testing

### Test Language Switching

1. Visit `http://localhost:3000` → Redirects to `/en`
2. Click language switcher → Changes to `/lo`
3. Navigate to movie → URL becomes `/lo/movies/123`
4. Switch back to English → URL becomes `/en/movies/123`

### Test SEO

View page source and check for:
- `<html lang="en">` or `<html lang="lo">`
- Proper hreflang tags
- Localized meta tags (title, description)

## Troubleshooting

### Issue: "Cannot find module './routing'"

**Solution:** Restart TypeScript server or rebuild:
```bash
npm run build
```

### Issue: Translations not showing

**Solution:** Check that:
1. Translation key exists in both `en.json` and `lo.json`
2. Component is wrapped in `NextIntlClientProvider`
3. Using correct namespace: `t('namespace.key')`

### Issue: Links not working

**Solution:** Use `Link` from `@/i18n/routing`, not `next/link`:
```typescript
import { Link } from '@/i18n/routing';
```

## Migration Checklist

When adding i18n to a new page:

- [ ] Move page to `/app/[locale]/` directory
- [ ] Add `'use client'` if using hooks
- [ ] Import `useTranslations` and `useLocale`
- [ ] Replace hardcoded text with `t('key')`
- [ ] Use `Link` from `@/i18n/routing`
- [ ] Use `getLocalizedText()` for content data
- [ ] Add translations to both `en.json` and `lo.json`
- [ ] Test both languages

## Resources

- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [Next.js Internationalization](https://nextjs.org/docs/app/building-your-application/routing/internationalization)
- [LANGUAGE_SYSTEM.md](../LANGUAGE_SYSTEM.md) - LocalizedText system
- [AGENTS.md](../AGENTS.md) - AI agent guidelines
