# Component Inventory

Reference for all React components in the Lao Cinema web app.

---

## Core Components

### `VideoPlayer`
**Location**: `components/video-player.tsx`  
**Type**: Client Component  

HLS video player with adaptive bitrate streaming, analytics tracking, and resume playback.

**Props**:
```typescript
interface VideoPlayerProps {
  src: string;              // HLS master.m3u8 URL
  poster?: string;          // Poster image URL
  title?: string;           // Video title (for controls)
  autoPlay?: boolean;       // Auto-start playback
  videoId?: string;         // Used for localStorage progress key
  movieId?: string;         // For API-based progress tracking
  movieTitle?: string;      // For analytics
  movieDuration?: number;   // Total duration in seconds
  constrainToViewport?: boolean; // Limit height to viewport
  aspectRatio?: string;     // e.g., "16:9", "2.35:1"
  onInfoClick?: () => void; // Callback for info button
}
```

**Features**:
- HLS.js integration with quality switching
- Continue watching dialog
- Keyboard shortcuts (space, arrows, f, m)
- Analytics tracking (start, progress, pause, complete)
- Fullscreen support

**Usage**:
```tsx
<VideoPlayer
  src="/videos/hls/movie-slug/master.m3u8"
  poster="/posters/movie.jpg"
  movieId="uuid"
  movieTitle="The Signal"
  movieDuration={7200}
/>
```

---

### `MovieCard`
**Location**: `components/movie-card.tsx`  
**Type**: Client Component  

Movie card for grid displays with poster, title, metadata, and availability badges.

**Props**:
```typescript
interface MovieCardProps {
  movie: Movie;  // Full movie object from API
}
```

**Features**:
- Localized title, tagline, genres
- Director and writer display
- Top 3 cast members
- Availability badges (external, unavailable, coming soon)
- Responsive hover effects

**Usage**:
```tsx
<MovieCard movie={movie} />
```

---

### `PaymentModal`
**Location**: `components/payment-modal.tsx`  
**Type**: Client Component  

Modal for rental payment flow.

**Props**:
```typescript
interface PaymentModalProps {
  movie: Movie;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (rental: Rental) => void;
  context?: 'required' | 'expired';  // Shows contextual message
}
```

**Features**:
- Demo payment mode (simulated)
- Context-aware messaging
- Rental creation via API

---

### `Header`
**Location**: `components/header.tsx`  
**Type**: Client Component  

Site header with navigation and language switcher.

**Features**:
- Logo/home link
- Navigation links
- Language switcher integration
- Responsive design

---

### `Footer`
**Location**: `components/footer.tsx`  
**Type**: Server Component  

Simple footer with copyright.

---

### `LanguageSwitcher`
**Location**: `components/language-switcher.tsx`  
**Type**: Client Component  

Toggle between English and Lao.

**Features**:
- Preserves current path on switch
- Uses next-intl routing
- Shows current language

---

### `ShareButton`
**Location**: `components/share-button.tsx`  
**Type**: Client Component  

Share movie via native share API or copy link.

**Props**:
```typescript
interface ShareButtonProps {
  title: string;
  text?: string;
  url?: string;
}
```

---

### `PosterGallery`
**Location**: `components/poster-gallery.tsx`  
**Type**: Client Component  

Gallery modal for viewing all movie posters/backdrops.

**Props**:
```typescript
interface PosterGalleryProps {
  images: MovieImage[];
  type: 'poster' | 'backdrop';
  movieTitle: string;
}
```

---

### `StreamingPlatformBadge`
**Location**: `components/streaming-platform-badge.tsx`  
**Type**: Server Component  

Badge showing external streaming platforms (Netflix, Prime, etc.).

**Props**:
```typescript
interface StreamingPlatformBadgeProps {
  platform: StreamingPlatform;
  url?: string;
}
```

---

### `ApiError`
**Location**: `components/api-error.tsx`  
**Type**: Client Component  

Error display component for API failures.

**Props**:
```typescript
interface ApiErrorProps {
  error: string;
  onRetry?: () => void;
}
```

---

## Video Subcomponents

**Location**: `components/video/`

### `VideoControls`
Play/pause, seek bar, volume, fullscreen controls.

### `BigPlayButton`
Large centered play button overlay.

### `VideoLoadingSpinner`
Loading indicator during buffering.

### `VideoErrorState`
Error display with retry option.

### `ContinueWatchingDialog`
Modal asking to resume or start over.

**Exports** (from `components/video/index.ts`):
```typescript
export { VideoControls, BigPlayButton, VideoLoadingSpinner, VideoErrorState, ContinueWatchingDialog }
```

---

## Admin Components

**Location**: `components/admin/`

### `MovieFormFields`
**Location**: `components/admin/movie-form-fields.tsx`  
**Type**: Client Component  

Reusable form fields for movie editing (title, overview, runtime, etc.).

**Props**:
```typescript
interface MovieFormFieldsProps {
  movie: Movie;
  onChange: (field: string, value: any) => void;
  locale: 'en' | 'lo';
}
```

---

### `PersonSearch`
**Location**: `components/admin/person-search.tsx`  
**Type**: Client Component  

Search and select people for cast/crew assignment.

**Props**:
```typescript
interface PersonSearchProps {
  onSelect: (person: Person) => void;
  excludeIds?: number[];  // Already assigned people
}
```

---

### `PosterManager`
**Location**: `components/admin/poster-manager.tsx`  
**Type**: Client Component  

Admin interface for managing movie posters (set primary, view all).

**Props**:
```typescript
interface PosterManagerProps {
  movieId: string;
  images: MovieImage[];
  onPrimaryChange: (imageId: string) => void;
}
```

---

### `AdminBreadcrumbs`
**Location**: `components/admin/admin-breadcrumbs.tsx`  
**Type**: Client Component  

Breadcrumb navigation for admin dashboard showing current location and allowing quick navigation back to previous pages.

**Features**:
- Automatically generates breadcrumbs based on current route
- Fetches movie/person names dynamically for detail pages
- Home icon links to admin dashboard
- Supports all admin routes (movies, people, edit, add, import, analytics, homepage)

**Usage**:
```tsx
// Used in admin layout - no props needed
<AdminBreadcrumbs />
```

**Routes Supported**:
- `/admin` → Dashboard
- `/admin/movies` → Dashboard > All Movies
- `/admin/edit/[id]` → Dashboard > All Movies > [Movie Title]
- `/admin/people` → Dashboard > All People
- `/admin/people/[id]` → Dashboard > All People > [Person Name]
- `/admin/add` → Dashboard > Add New Movie
- `/admin/import` → Dashboard > Import from TMDB
- `/admin/analytics` → Dashboard > Analytics
- `/admin/homepage` → Dashboard > Homepage Settings

---

## UI Components (shadcn/ui)

**Location**: `components/ui/`

Pre-styled components from shadcn/ui:

| Component | File | Description |
|-----------|------|-------------|
| `Button` | `button.tsx` | Primary, secondary, ghost variants |
| `Card` | `card.tsx` | Card, CardHeader, CardContent, CardFooter |
| `Badge` | `badge.tsx` | Label badges with variants |
| `Dialog` | `dialog.tsx` | Modal dialogs |
| `Input` | `input.tsx` | Text input fields |
| `Label` | `label.tsx` | Form labels |
| `Tabs` | `tabs.tsx` | Tab navigation |
| `Textarea` | `textarea.tsx` | Multi-line text input |

**Usage**:
```tsx
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

<Card>
  <CardContent>
    <Button variant="secondary">Click me</Button>
  </CardContent>
</Card>
```

---

## Auth Components

**Location**: `components/auth/`

*(Placeholder for future login/register forms)*

---

## Component Patterns

### Server vs Client Components

| Pattern | Use |
|---------|-----|
| **Server Component** | Static content, no interactivity, data fetching |
| **Client Component** | Hooks, event handlers, browser APIs |

**Rule**: Default to Server Components. Add `'use client'` only when needed.

### Localization in Components

```tsx
// UI text (labels, buttons)
import { useTranslations } from 'next-intl';
const t = useTranslations('movie');
<h1>{t('watchNow')}</h1>

// Content data (titles, descriptions)
import { useLocale } from 'next-intl';
import { getLocalizedText } from '@/lib/i18n';
const locale = useLocale() as 'en' | 'lo';
const title = getLocalizedText(movie.title, locale);
```

### Props with Movie Type

Always use the `Movie` type from `@/lib/types`:

```tsx
import { Movie } from '@/lib/types';

interface MyComponentProps {
  movie: Movie;
}
```

---

## File Naming Conventions

| Convention | Example |
|------------|---------|
| Component files | `kebab-case.tsx` |
| Component names | `PascalCase` |
| Test files | `__tests__/component-name.test.tsx` |
| Index exports | `index.ts` for directories |

---

## Testing

Components have tests in `__tests__/` directories:

```bash
cd web
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm test -- movie-card      # Run specific test
```
