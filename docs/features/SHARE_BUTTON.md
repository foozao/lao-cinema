# Share Button Component

## Overview

A reusable share button component that allows users to share content via native share dialog (mobile) or copy link to clipboard (desktop).

## Features

- **Smart Sharing**: Tries native share API first (mobile), falls back to clipboard copy
- **Non-Localized URLs**: Always shares the non-localized URL with vanity slug if available
- **Visual Feedback**: Shows "Copied!" confirmation when link is copied
- **Tooltip**: Hover tooltip indicates action (share or copy)
- **Responsive**: Works on mobile and desktop
- **Accessible**: Keyboard accessible and screen reader friendly

## Component Location

`/web/components/share-button.tsx`

## Usage

### Basic Usage

```tsx
import { ShareButton } from '@/components/share-button';

<ShareButton
  path="/movies/the-signal"
  title="The Signal"
  description="A thrilling sci-fi movie"
/>
```

### With Vanity URL

```tsx
import { ShareButton } from '@/components/share-button';
import { getMoviePath } from '@/lib/movie-url';

<ShareButton
  path={`/movies/${getMoviePath(movie)}`}
  title={movie.title.en}
  description={movie.overview.en}
/>
```

### Custom Styling

```tsx
<ShareButton
  path="/movies/the-signal"
  title="The Signal"
  variant="outline"
  size="lg"
  showLabel={false} // Icon only
  className="custom-class"
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `path` | `string` | **Required** | The path to share (without locale prefix) |
| `title` | `string` | `"Check this out"` | Title for native share dialog |
| `description` | `string` | `undefined` | Description for native share dialog |
| `variant` | `'default' \| 'outline' \| 'ghost' \| 'secondary'` | `'outline'` | Button variant |
| `size` | `'default' \| 'sm' \| 'lg' \| 'icon'` | `'default'` | Button size |
| `showLabel` | `boolean` | `true` | Show "Share" text or icon only |
| `className` | `string` | `undefined` | Custom CSS classes |

## Behavior

### Desktop (No Native Share)
1. User clicks button
2. URL is copied to clipboard
3. Button shows "Copied!" with checkmark
4. Reverts to "Share" after 2 seconds

### Mobile (Native Share Available)
1. User clicks button
2. Native share dialog opens
3. User can share via apps (Messages, WhatsApp, etc.)
4. If user cancels, nothing happens
5. If share fails, falls back to clipboard copy

### URL Format

The component always shares **non-localized URLs**:

**Input path**: `/movies/the-signal`
**Shared URL**: `https://laocinema.com/movies/the-signal`

The middleware will automatically redirect users to their preferred locale:
- English speakers → `/en/movies/the-signal`
- Lao speakers → `/lo/movies/the-signal`
- Thai speakers → `/lo/movies/the-signal`

## Examples

### Movie Detail Page

```tsx
<ShareButton
  path={`/movies/${getMoviePath(movie)}`}
  title={title}
  description={overview}
  size="lg"
  variant="outline"
  className="px-6 md:px-8 py-5 md:py-6"
/>
```

### Movie Card

```tsx
<ShareButton
  path={`/movies/${movie.slug || movie.id}`}
  title={movie.title.en}
  size="sm"
  showLabel={false}
/>
```

### Person Page

```tsx
<ShareButton
  path={`/people/${person.id}`}
  title={person.name.en}
  description={person.biography?.en}
  variant="ghost"
/>
```

## Styling

The component uses Tailwind CSS and shadcn/ui Button component:

- **Tooltip**: Dark background with arrow pointer
- **Button States**: Hover, active, disabled
- **Icons**: Lucide React (Share2, Check)
- **Responsive**: Adapts to screen size

## Accessibility

- ✅ Keyboard accessible (Tab, Enter, Space)
- ✅ ARIA labels for screen readers
- ✅ Focus indicators
- ✅ High contrast tooltip
- ✅ Clear visual feedback

## Browser Support

### Native Share API
- ✅ iOS Safari 12+
- ✅ Android Chrome 61+
- ✅ Android Firefox 71+
- ❌ Desktop browsers (falls back to clipboard)

### Clipboard API
- ✅ Chrome 63+
- ✅ Firefox 53+
- ✅ Safari 13.1+
- ✅ Edge 79+

### Fallback
If both APIs fail, shows an alert with the URL to manually copy.

## Testing

### Test Native Share (Mobile)
1. Open on mobile device
2. Click share button
3. Verify native share dialog opens
4. Share to any app
5. Verify correct URL is shared

### Test Clipboard Copy (Desktop)
1. Open on desktop browser
2. Click share button
3. Verify "Copied!" appears
4. Paste in another app
5. Verify correct URL is copied

### Test URL Format
```bash
# Should share non-localized URL
Expected: https://laocinema.com/movies/the-signal
Not: https://laocinema.com/en/movies/the-signal
```

## Future Enhancements

Potential additions:
- [ ] Social media direct share (Facebook, Twitter, etc.)
- [ ] QR code generation
- [ ] Email share
- [ ] WhatsApp direct link
- [ ] Copy with custom message template
- [ ] Analytics tracking for shares

## Related Components

- **Button** (`/web/components/ui/button.tsx`) - Base button component
- **MovieCard** (`/web/components/movie-card.tsx`) - Could add share button
- **Header** (`/web/components/header.tsx`) - Could add page share

## Related Documentation

- [Vanity URLs](./VANITY_URLS.md) - URL slug system
- [Locale Detection](./LOCALE_DETECTION.md) - Automatic language detection
- [Movie URL Helpers](../../web/lib/movie-url.ts) - URL generation utilities
