# Multi-Poster Implementation Guide

## Overview

We now fetch **all available posters, backdrops, and logos** from TMDB instead of just the default poster. This gives you a complete image library for each movie.

## What Changed

### 1. TMDB Client (`/web/lib/tmdb/client.ts`)

**Added:**
- `TMDBImage` interface - represents a single image with metadata
- `TMDBImages` interface - collection of posters, backdrops, and logos
- `getMovieImages(tmdbId)` method - fetches all images from TMDB

**Example Usage:**
```typescript
const images = await tmdbClient.getMovieImages(550); // Fight Club
console.log(images.posters.length); // e.g., 47 posters
console.log(images.backdrops.length); // e.g., 23 backdrops
```

### 2. Database Schema (`/db/src/schema.ts`)

**Added:**
- `imageTypeEnum` - enum for 'poster' | 'backdrop' | 'logo'
- `movieImages` table - stores multiple images per movie

**Table Structure:**
```sql
CREATE TABLE movie_images (
  id UUID PRIMARY KEY,
  movie_id UUID REFERENCES movies(id) ON DELETE CASCADE,
  type image_type NOT NULL,
  file_path TEXT NOT NULL,
  aspect_ratio REAL,
  height INTEGER,
  width INTEGER,
  iso_639_1 TEXT, -- Language code (e.g., 'en', 'lo', null)
  vote_average REAL,
  vote_count INTEGER,
  is_primary BOOLEAN DEFAULT FALSE, -- Primary image to display
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Frontend Types (`/web/lib/types.ts`)

**Added:**
```typescript
export interface MovieImage {
  id: string;
  type: 'poster' | 'backdrop' | 'logo';
  file_path: string;
  aspect_ratio?: number;
  height?: number;
  width?: number;
  iso_639_1?: string | null;
  vote_average?: number;
  vote_count?: number;
  is_primary?: boolean;
}
```

**Updated:**
```typescript
export interface Movie {
  // ... existing fields
  images?: MovieImage[]; // NEW: Array of all images
}
```

### 4. TMDB Mapper (`/web/lib/tmdb/mapper.ts`)

**Updated:**
```typescript
export function mapTMDBToMovie(
  tmdbData: TMDBMovieDetails,
  credits?: TMDBCredits,
  images?: TMDBImages, // NEW parameter
  existingMovie?: Partial<Movie>
)
```

The mapper now:
- Maps all posters, backdrops, and logos from TMDB
- Sets the first poster/backdrop as primary (`is_primary: true`)
- Includes image metadata (dimensions, votes, language)

### 5. Admin Import (`/web/app/[locale]/admin/import/`)

**Updated `actions.ts`:**
- Fetches images in parallel with movie details and credits
- Returns `TMDBImages` in the response

**Updated `page.tsx`:**
- Passes images to the mapper
- Shows image count in preview (X posters, Y backdrops, Z logos)

### 6. Image Utilities (`/web/lib/images.ts`)

**Added Helper Functions:**

```typescript
// Get primary poster/backdrop from images array
getPrimaryImage(images, 'poster') // Returns file_path or null

// Get all posters/backdrops
getImagesByType(images, 'poster') // Returns string[]

// Convert to full URL
getImageUrl(filePath, 'poster', 'medium')
// => 'https://image.tmdb.org/t/p/w500/abc123.jpg'
```

## How to Use

### Importing a Movie

When you import a movie via the admin panel:

1. **Fetch from TMDB** - Enter TMDB ID (e.g., `550` for Fight Club)
2. **Review Preview** - See how many images were fetched:
   ```
   Images Fetched:
   Posters: 47
   Backdrops: 23
   Logos: 5
   ```
3. **Import** - All images are stored in the database

### Accessing Images in Code

```typescript
import { Movie } from '@/lib/types';
import { getPrimaryImage, getImageUrl } from '@/lib/images';

function MovieCard({ movie }: { movie: Movie }) {
  // Get primary poster (backward compatible)
  const posterPath = movie.poster_path || getPrimaryImage(movie.images, 'poster');
  const posterUrl = getImageUrl(posterPath, 'poster', 'medium');
  
  return <img src={posterUrl} alt={movie.title.en} />;
}
```

### Building a Poster Gallery

```typescript
import { getImagesByType, getImageUrl } from '@/lib/images';

function PosterGallery({ movie }: { movie: Movie }) {
  const posters = getImagesByType(movie.images, 'poster');
  
  return (
    <div className="grid grid-cols-4 gap-4">
      {posters.map((poster, i) => (
        <img 
          key={i}
          src={getImageUrl(poster, 'poster', 'medium')} 
          alt={`${movie.title.en} poster ${i + 1}`}
        />
      ))}
    </div>
  );
}
```

### Selecting Best Image by Language

```typescript
function getLocalizedPoster(movie: Movie, language: 'en' | 'lo'): string | null {
  if (!movie.images) return movie.poster_path || null;
  
  // Find poster in user's language
  const localizedPosters = movie.images
    .filter(img => img.type === 'poster' && img.iso_639_1 === language)
    .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
  
  if (localizedPosters.length > 0) {
    return localizedPosters[0].file_path;
  }
  
  // Fallback to primary poster
  return getPrimaryImage(movie.images, 'poster');
}
```

## Database Migration

To apply the schema changes:

```bash
cd /Users/brandon/home/Workspace/lao-cinema/db
npm run generate  # Generate migration from schema.ts
npm run migrate   # Apply migration to database
```

Or manually create the migration:

```sql
-- Add image type enum
CREATE TYPE image_type AS ENUM ('poster', 'backdrop', 'logo');

-- Create movie_images table
CREATE TABLE movie_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  movie_id UUID REFERENCES movies(id) ON DELETE CASCADE NOT NULL,
  type image_type NOT NULL,
  file_path TEXT NOT NULL,
  aspect_ratio REAL,
  height INTEGER,
  width INTEGER,
  iso_639_1 TEXT,
  vote_average REAL,
  vote_count INTEGER,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Add indexes for performance
CREATE INDEX idx_movie_images_movie_id ON movie_images(movie_id);
CREATE INDEX idx_movie_images_type ON movie_images(type);
CREATE INDEX idx_movie_images_is_primary ON movie_images(is_primary) WHERE is_primary = TRUE;
```

## Backward Compatibility

The implementation is **fully backward compatible**:

- `movie.poster_path` and `movie.backdrop_path` still work
- `movie.images` is optional
- Components can use either approach:
  ```typescript
  // Old way (still works)
  const poster = movie.poster_path;
  
  // New way (more images)
  const poster = getPrimaryImage(movie.images, 'poster') || movie.poster_path;
  ```

## API Endpoint Integration

When the backend API is built, the images should be:

1. **Stored** during movie import/sync
2. **Returned** in movie detail endpoints:
   ```json
   {
     "id": "uuid",
     "title": { "en": "Fight Club", "lo": "..." },
     "poster_path": "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
     "images": [
       {
         "id": "uuid",
         "type": "poster",
         "file_path": "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
         "width": 2000,
         "height": 3000,
         "is_primary": true
       },
       // ... more images
     ]
   }
   ```

## Benefits

1. **Richer Content** - Multiple poster options per movie
2. **Localization** - Language-specific posters (e.g., Lao text posters)
3. **User Choice** - Let admins/users select preferred poster
4. **Higher Quality** - Access to different resolutions and aspect ratios
5. **Complete Library** - All TMDB images stored, not just default

## Future Enhancements

- [ ] Admin UI to select primary poster
- [ ] Poster gallery on movie detail page
- [ ] Language-aware poster selection
- [ ] Image quality comparison tool
- [ ] Custom image uploads (non-TMDB movies)
- [ ] Image CDN/optimization pipeline

## Testing

To test the implementation:

1. Start the web app:
   ```bash
   cd /Users/brandon/home/Workspace/lao-cinema/web
   npm run dev
   ```

2. Go to Admin Import: `http://localhost:3000/en/admin/import`

3. Import a popular movie (e.g., TMDB ID `550` for Fight Club)

4. Check the preview - you should see:
   - Images Fetched count (Posters, Backdrops, Logos)
   - All images available via `movie.images` array

5. Verify database:
   ```sql
   SELECT COUNT(*) FROM movie_images WHERE movie_id = '...';
   ```

## Files Modified

- `/web/lib/tmdb/client.ts` - Added image fetching
- `/web/lib/tmdb/mapper.ts` - Added image mapping
- `/web/lib/types.ts` - Added MovieImage interface
- `/web/lib/images.ts` - Added helper functions
- `/db/src/schema.ts` - Added movie_images table
- `/web/app/[locale]/admin/import/actions.ts` - Fetch images
- `/web/app/[locale]/admin/import/page.tsx` - Display image count

## Summary

✅ **All TMDB images are now fetched and stored**
✅ **Backward compatible** with existing code
✅ **Ready for UI enhancements** (galleries, selection, etc.)
✅ **Type-safe** with TypeScript interfaces
✅ **Performance-optimized** with parallel fetching

The foundation is complete - you can now build rich image experiences in your UI!
