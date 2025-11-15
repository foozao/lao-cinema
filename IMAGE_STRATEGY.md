# Image Strategy for Lao Cinema

## Current Implementation

### TMDB Images (Imported Movies)
- **Method**: Direct links to TMDB CDN
- **Format**: `https://image.tmdb.org/t/p/{size}{path}`
- **Sizes Available**:
  - `w92` - Thumbnails (92px wide)
  - `w185` - Small posters
  - `w500` - Medium posters
  - `w780` - Large posters
  - `original` - Full resolution
- **Storage**: Only store the path (e.g., `/abc123.jpg`), not full URL
- **Legal**: ✅ Allowed per TMDB terms (with attribution)

### Image Types
1. **Posters** - Movie posters (2:3 aspect ratio)
2. **Backdrops** - Wide hero images (16:9 aspect ratio)
3. **Profile Photos** - Cast/crew headshots (square/portrait)

## TMDB Terms Compliance

### ✅ What We're Doing Right
- Linking to TMDB CDN (not re-hosting)
- Storing only paths in database
- Adding attribution footer
- Using their official image sizes

### ⚠️ What We Must Do
- [ ] Add TMDB logo/attribution on pages using their data
- [ ] Link to TMDB when showing their content
- [ ] Respect their rate limits (40 requests/10 seconds)

### ❌ What We Cannot Do
- Download and re-host TMDB images
- Remove attribution
- Use images commercially without proper licensing

## Future: Custom Images for Lao Films

For original Lao content not in TMDB:

### Option 1: Cloud Storage (Recommended)
**Provider**: Cloudflare R2, AWS S3, or Bunny CDN

**Pros**:
- Cheap storage ($0.015/GB on R2)
- Global CDN
- Image optimization
- Scalable

**Implementation**:
```typescript
// Store full URL for custom images
poster_path: "https://cdn.laocinema.com/posters/movie-123.jpg"
// OR TMDB path
poster_path: "/abc123.jpg"  // Detected by leading slash

// Helper function
function getImageUrl(path: string): string {
  if (path.startsWith('http')) {
    return path; // Custom hosted image
  }
  return `https://image.tmdb.org/t/p/w500${path}`; // TMDB
}
```

### Option 2: Next.js Image Optimization
Use Next.js built-in image optimization for custom uploads:

```typescript
<Image
  src={customImage}
  width={500}
  height={750}
  alt={title}
/>
```

**Pros**:
- Automatic optimization
- WebP conversion
- Lazy loading
- Responsive images

**Cons**:
- Requires server-side rendering
- Storage still needed

## Recommended Architecture

### Phase 1: TMDB Only (Current) ✅
```
Database: poster_path = "/abc123.jpg"
Display:  https://image.tmdb.org/t/p/w500/abc123.jpg
```

### Phase 2: Mixed Sources (Future)
```typescript
interface Movie {
  poster_path?: string;      // TMDB path or full URL
  poster_source: 'tmdb' | 'custom';
  custom_poster_url?: string; // Full CDN URL if custom
}

function getMoviePoster(movie: Movie, size: string = 'w500'): string {
  if (movie.poster_source === 'custom' && movie.custom_poster_url) {
    return movie.custom_poster_url;
  }
  return `https://image.tmdb.org/t/p/${size}${movie.poster_path}`;
}
```

### Phase 3: Upload Interface
Add to admin panel:
- File upload for posters/backdrops
- Image cropping/resizing
- Upload to CDN
- Store URL in database

## Image Optimization Best Practices

### 1. Use Appropriate Sizes
```typescript
// Thumbnails (movie cards)
w185 or w342

// Detail pages
w500 or w780

// Full screen hero
original or w1280
```

### 2. Lazy Loading
```tsx
<img loading="lazy" src={posterUrl} alt={title} />
```

### 3. Responsive Images
```tsx
<Image
  src={posterUrl}
  sizes="(max-width: 768px) 50vw, 33vw"
  alt={title}
/>
```

### 4. Fallback Images
```typescript
poster_path || '/placeholder-poster.jpg'
```

## Cost Analysis

### Current (TMDB CDN)
- **Storage**: $0 (TMDB hosts)
- **Bandwidth**: $0 (TMDB serves)
- **Total**: $0/month ✅

### Future (Custom Images)
Assuming 100 movies with custom images:
- **Storage**: 100 movies × 5MB = 500MB = $0.01/month
- **Bandwidth**: 10,000 views × 500KB = 5GB = $0.05/month
- **Total**: ~$0.06/month (negligible)

## Implementation Checklist

### Immediate (Required)
- [x] Add TMDB attribution to footer
- [ ] Add TMDB logo to pages with their data
- [ ] Create image helper functions
- [ ] Document image usage in README

### Short-term (Nice to have)
- [ ] Add image size optimization
- [ ] Implement lazy loading everywhere
- [ ] Add placeholder images
- [ ] Error handling for missing images

### Long-term (Future feature)
- [ ] Set up CDN (Cloudflare R2 or similar)
- [ ] Add image upload to admin panel
- [ ] Implement image processing pipeline
- [ ] Support custom images for Lao films

## Recommendation

**Keep using TMDB CDN for now** because:
1. ✅ Legal and free
2. ✅ No infrastructure needed
3. ✅ Global CDN performance
4. ✅ Multiple size options
5. ✅ Always up-to-date

**Add custom image support later** when:
- You have original Lao films not in TMDB
- You need custom promotional materials
- You want to customize image presentation

## Code Example: Image Helper

```typescript
// /web/lib/images.ts
export function getImageUrl(
  path: string | null | undefined,
  type: 'poster' | 'backdrop' | 'profile' = 'poster',
  size: 'small' | 'medium' | 'large' | 'original' = 'medium'
): string | null {
  if (!path) return null;

  // If already a full URL (custom hosted)
  if (path.startsWith('http')) {
    return path;
  }

  // TMDB image
  const sizeMap = {
    poster: { small: 'w185', medium: 'w500', large: 'w780', original: 'original' },
    backdrop: { small: 'w300', medium: 'w780', large: 'w1280', original: 'original' },
    profile: { small: 'w45', medium: 'w185', large: 'h632', original: 'original' },
  };

  const tmdbSize = sizeMap[type][size];
  return `https://image.tmdb.org/t/p/${tmdbSize}${path}`;
}
```

## Attribution Requirements

Per TMDB terms, add this to any page using TMDB data:

```tsx
<div className="flex items-center gap-2 text-xs text-gray-500">
  <span>Data provided by</span>
  <a href="https://www.themoviedb.org" target="_blank" rel="noopener">
    <img src="/tmdb-logo.svg" alt="TMDB" className="h-4" />
  </a>
</div>
```

Download TMDB logo from: https://www.themoviedb.org/about/logos-attribution
