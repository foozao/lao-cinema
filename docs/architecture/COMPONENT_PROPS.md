# Component Props Cheat Sheet

Quick reference for common component props. Full details in `web/COMPONENTS.md`.

---

## Core Components

### VideoPlayer
```typescript
// components/video-player.tsx
src: string              // HLS master.m3u8 URL (required)
poster?: string          // Poster image URL
movieId?: string         // For API progress tracking
movieTitle?: string      // For analytics
movieDuration?: number   // Total duration in seconds
aspectRatio?: string     // "16:9", "2.35:1", "2.39:1"
autoPlay?: boolean       // Auto-start playback
constrainToViewport?: boolean  // Limit height to viewport
onInfoClick?: () => void // Callback for info button
```

### MovieCard
```typescript
// components/movie-card.tsx
movie: Movie             // Full movie object (required)
```
Displays poster, title, genres, director, top cast, availability badges.

### ShortPackCard
```typescript
// components/short-pack-card.tsx
pack: ShortPackSummary   // Short pack summary (required)
```

### PaymentModal
```typescript
// components/payment-modal.tsx
movie: Movie             // Movie to rent (required)
isOpen: boolean          // Modal visibility (required)
onClose: () => void      // Close callback (required)
onSuccess: (rental: Rental) => void  // Success callback (required)
context?: 'required' | 'expired'     // Shows contextual message
```

### PosterGallery
```typescript
// components/poster-gallery.tsx
images: MovieImage[]     // Array of images (required)
type: 'poster' | 'backdrop'  // Image type (required)
movieTitle: string       // For accessibility (required)
```

### ShareButton
```typescript
// components/share-button.tsx
title: string            // Share title (required)
text?: string            // Share description
url?: string             // URL to share (defaults to current)
```

### TrailerPlayer
```typescript
// components/trailer-player.tsx
trailer: Trailer         // YouTube or video trailer (required)
autoPlay?: boolean       // Auto-start
onEnded?: () => void     // Playback ended callback
```

---

## Auth Components

### LoginForm
```typescript
// components/auth/login-form.tsx
// No props - uses useAuth hook internally
```

### RegisterForm
```typescript
// components/auth/register-form.tsx
// No props - uses useAuth hook internally
```

### UserMenu
```typescript
// components/auth/user-menu.tsx
// No props - reads user from AuthContext
```

---

## Admin Components

### PersonSearch
```typescript
// components/admin/person-search.tsx
onSelect: (person: Person) => void  // Selection callback (required)
excludeIds?: number[]    // IDs to exclude from results
```

### ProductionCompanySearch
```typescript
// components/admin/production-company-search.tsx
onSelect: (company: ProductionCompany) => void  // Selection callback (required)
excludeIds?: number[]    // IDs to exclude from results
```

### PosterManager
```typescript
// components/admin/poster-manager.tsx
movieId: string          // Movie ID (required)
images: MovieImage[]     // Current images (required)
onPrimaryChange: (imageId: string) => void  // Primary change callback (required)
```

### EntityHistory
```typescript
// components/admin/entity-history.tsx
entityType: 'movie' | 'person' | 'production_company'  // (required)
entityId: string         // Entity ID (required)
```

### MergePeopleDialog
```typescript
// components/admin/merge-people-dialog.tsx
sourcePerson: Person     // Person to merge away (required)
isOpen: boolean          // Dialog visibility (required)
onClose: () => void      // Close callback (required)
onMerge: (targetPersonId: number) => void  // Merge callback (required)
```

### MovieFormFields
```typescript
// components/admin/movie-form-fields.tsx
movie: Movie             // Movie being edited (required)
onChange: (field: string, value: any) => void  // Change callback (required)
locale: 'en' | 'lo'      // Current locale tab (required)
```

### SubtitleManager
```typescript
// components/admin/subtitle-manager.tsx
movieId: string          // Movie ID (required)
subtitles: SubtitleTrack[]  // Current subtitles (required)
onUpdate: () => void     // Refresh callback (required)
```

### ImageUploader
```typescript
// components/admin/image-uploader.tsx
entityType: 'movie' | 'person' | 'production_company'  // (required)
entityId: string         // Entity ID (required)
imageType: 'poster' | 'backdrop' | 'profile' | 'logo'  // (required)
onSuccess: (url: string) => void  // Upload success callback (required)
```

---

## UI Components (shadcn/ui)

### Button
```typescript
// components/ui/button.tsx
variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
size?: 'default' | 'sm' | 'lg' | 'icon'
asChild?: boolean        // Render as child element
```

### Card
```typescript
// components/ui/card.tsx
// Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
// All accept className for styling
```

### Dialog
```typescript
// components/ui/dialog.tsx
// Dialog (root), DialogTrigger, DialogContent, DialogHeader, 
// DialogTitle, DialogDescription, DialogFooter
open?: boolean           // Controlled open state
onOpenChange?: (open: boolean) => void
```

### Badge
```typescript
// components/ui/badge.tsx
variant?: 'default' | 'secondary' | 'destructive' | 'outline'
```

---

## Common Patterns

### Passing Movie Data
```tsx
// Full movie for detail views
<MovieCard movie={movie} />
<PaymentModal movie={movie} ... />

// Summary for listings
<ShortPackCard pack={packSummary} />
```

### Modal Pattern
```tsx
const [isOpen, setIsOpen] = useState(false);

<PaymentModal 
  movie={movie}
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onSuccess={(rental) => { /* handle success */ }}
/>
```

### Search + Select Pattern
```tsx
<PersonSearch
  onSelect={(person) => addCastMember(person)}
  excludeIds={existingCastIds}
/>
```

---

## Type Imports

```typescript
import type { Movie, Person, Rental, ShortPackSummary } from '@/lib/types';
import type { MovieImage, SubtitleTrack, Trailer } from '@/lib/types';
```
