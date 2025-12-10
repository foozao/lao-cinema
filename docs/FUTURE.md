
Possible Future Changes:

* some info on Lao cinema history
  - maybe a chronology
  - kind of like a wiki?

* maybe articles/reviews linked to the movie/person

* award listings for movie/person

* tracking time on featured, and views/rentals at that time

* maybe a film festival later

* adding news/articles about lao cinema

* fix Vercel version

* building custom cast receiver

- Gamification? 
  - Badges for things seen
    - Feature film, short film, film that won award X, film with .. 

## Performance & UX Optimizations

### Server Components + Streaming SSR
**Goal**: Eliminate loading states for static content, enable progressive rendering

**Approach**:
- Convert pages (movie detail, people detail, etc.) from Client Components to Server Components
- Use Suspense boundaries within pages for dynamic sections (cast, related movies, recommendations)
- Leverage Next.js streaming SSR for progressive page rendering
- Static content (title, description, poster) renders immediately
- Dynamic sections stream in as data becomes available

**Benefits**:
- No loading state flash for static content
- Perceived performance improvement (content appears faster)
- Better SEO (fully server-rendered content)
- Reduced client-side bundle size
- Smooth progressive rendering (no layout shifts)

**Challenges**:
- Requires refactoring client-only features (useState, useEffect, event handlers)
- Need to identify which sections truly need client interactivity
- May need to extract interactive components (video player, modals, forms) into separate Client Components
- Testing complexity increases (both server and client rendering paths)

**Trade-offs**:
- Initial development effort vs long-term UX gains
- Loss of some client-side instant feedback (optimistic updates)
- More complex data fetching patterns (server vs client)

**Priority**: Medium-Low (current loading UX is good enough, this is polish)

---

## Mobile App Development

📱 **See full analysis**: [MOBILE_APP_PLAN.md](./MOBILE_APP_PLAN.md)

**Quick Summary**:
- **Technology**: React Native + Expo (recommended)
- **Code Reuse**: 40-60% from existing web codebase
- **Timeline**: 3-4 months for full MVP
- **Cost**: $100/year (app stores) + development time
- **Decision**: Wait until web app is feature-complete

**Key Libraries**:
- Expo Router (navigation, like Next.js App Router)
- Expo AV (HLS video playback)
- NativeWind (Tailwind for React Native)
- React Native Paper (component library)
- react-i18next (internationalization)

**What Can Be Reused**:
- ✅ All TypeScript types (`/web/lib/types.ts`)
- ✅ API client and business logic (`/web/lib/*`)
- ✅ Translation files (with minor changes)
- ✅ Analytics tracking
- ✅ Rental system logic

**What Must Be Rewritten**:
- ❌ All UI components (HTML → React Native)
- ❌ Styling (CSS → StyleSheet/NativeWind)
- ❌ Navigation (Next.js → Expo Router)
- ❌ Video player (hls.js → Expo AV)

**Recommendation**: Build mobile app as **Phase 2** after web is stable and proven.

**Maintenance Overhead** (detailed in full plan):
- **+30-50% ongoing development time** to support both platforms
- Backend changes: 0% extra work (both platforms use same API)
- Business logic: +10-20% extra (test on both platforms)
- UI features: +50-75% extra (reimplement UI layer)

**Example**: Adding a new screen takes 2 days on web, 1 day to port to mobile = 3 days total

**Strategies to Minimize Divergence**:
1. Shared code architecture (`/shared` package with types, API client, utils)
2. Feature flags (roll out to one platform first, then the other)
3. Component parity checklist (track what's implemented where)
4. Design system alignment (same prop names across platforms)
5. Web-first development (iterate faster, then port improved version to mobile)

**Platform-Specific Features** (OK to differ):
- Mobile-only: Offline viewing, push notifications, biometric auth, PiP
- Web-only: Admin panel, SEO, keyboard shortcuts, multi-tab workflows

---

## Subtitle/Caption Support (.srt/.vtt files)

### Feature Overview
Add support for subtitle files (.srt format) with user-controlled toggle to show/hide captions during video playback.

### Complexity: ⭐⭐⭐ Medium (4-6 hours)

**Why Medium Complexity**:
- ✅ HTML5 `<video>` has native `<track>` support (no external libraries needed for playback)
- ✅ Browsers handle rendering and styling automatically
- ⚠️ Need to convert .srt → .vtt format (browsers only support WebVTT)
- ⚠️ Requires database schema changes, API endpoints, admin UI, and player updates

### Implementation Plan

#### 1. Database Schema (30 min)

**New table**: `video_subtitles`
```sql
CREATE TABLE video_subtitles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_source_id UUID REFERENCES video_sources(id) ON DELETE CASCADE,
  language VARCHAR(10) NOT NULL,  -- 'en', 'lo', 'th', 'zh'
  label_en TEXT NOT NULL,          -- 'English', 'English (SDH)'
  label_lo TEXT NOT NULL,          -- 'ພາສາອັງກິດ', 'ພາສາລາວ'
  file_url TEXT NOT NULL,          -- GCS URL to .vtt file
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Key decisions**:
- Link to `video_sources` (not `movies`) - different qualities may have different subtitle files
- Store bilingual labels for better UX
- Store only `.vtt` format (convert .srt on upload server-side)

#### 2. Format Conversion

**SRT → VTT conversion** (server-side on upload):
- Use Node library like `srt-to-vtt` or `subsrt`
- Main difference: timestamp format (`,` → `.`) and header (`WEBVTT`)
- Example:
  ```
  SRT: 00:01:30,500 --> 00:01:33,200
  VTT: 00:01:30.500 --> 00:01:33.200
  ```

#### 3. Backend API (1 hour)

**New endpoints** in `api/src/routes/movies.ts`:
- `GET /api/movies/:id/subtitles` - Fetch all subtitles for a movie
- `POST /api/movies/:id/subtitles` - Upload subtitle file (admin only)
- `PATCH /api/subtitles/:id` - Update subtitle metadata (admin)
- `DELETE /api/subtitles/:id` - Delete subtitle (admin)

**File storage**: Use same GCS bucket as video files

#### 4. Video Player Updates (2 hours)

**Component**: `web/components/video-player.tsx`

```tsx
// Add subtitles prop
interface VideoPlayerProps {
  subtitles?: Array<{
    id: string;
    language: string;
    label: string;
    fileUrl: string;
    isDefault: boolean;
  }>;
}

// Update JSX
<video ref={videoRef}>
  {subtitles?.map((subtitle) => (
    <track
      key={subtitle.id}
      kind="subtitles"
      src={subtitle.fileUrl}
      srcLang={subtitle.language}
      label={subtitle.label}
      default={subtitle.isDefault}
    />
  ))}
</video>
```

**New controls**:
- CC button in player controls (toggle on/off)
- Dropdown menu for language selection
- Keyboard shortcut: `C` key to toggle

#### 5. Admin Panel Integration (1.5 hours)

**Movie edit page** - Add subtitle management section:
- File upload (accept `.srt` or `.vtt`)
- Subtitle list with edit/delete actions
- Language selector dropdown
- Bilingual label inputs (en/lo)
- Default checkbox

#### 6. UI/UX Polish (1 hour)

- Subtitle toggle button with icon (Subtitles / SubtitlesOff from lucide-react)
- Language selector dropdown in player controls
- Keyboard shortcut integration
- Styling customization options (size, color, background)

### Browser Compatibility

✅ **Excellent support** across all modern browsers:
- Chrome/Edge: Full support
- Firefox: Full support
- Safari (desktop + iOS): Full support
- Android Chrome: Full support

WebVTT is a web standard with universal browser support.

### Technical Benefits

- **Accessibility**: Critical for hearing-impaired users
- **SEO**: Search engines can index captions
- **Multi-language**: Support multiple subtitle tracks per video
- **Zero dependencies**: Native browser functionality (no libraries needed)
- **User choice**: Users can toggle on/off and select language

### Migration Path

If subtitle files already exist:

1. **Convert** existing .srt to .vtt:
   ```bash
   for file in *.srt; do
     ffmpeg -i "$file" "${file%.srt}.vtt"
   done
   ```

2. **Upload** to GCS (same bucket as video files)

3. **Populate database** with migration script

### Priority

**Medium** - Improves accessibility and UX, but not blocking for launch.

**Recommendation**: Implement after core rental/auth features are stable.

---

## Personalized Recommendations Based on Cast/Crew

### Feature Overview
Suggest movies to users based on actors, directors, and crew from films they've already watched. If a user watched multiple movies with the same director or actor, recommend other films featuring those same people.

### Complexity: ⭐⭐⭐ Medium (6-8 hours)

**Why Medium Complexity**:
- ✅ All required data already exists (watch_progress, movie_cast, movie_crew tables)
- ✅ No new database tables needed
- ⚠️ Complex SQL queries with multiple joins and aggregations
- ⚠️ Performance optimization needed (caching, indexing)
- ⚠️ Requires admin toggle/settings system

### How It Works

1. **Identify watched movies**: Query `watch_progress` for movies user completed (>90%)
2. **Extract people**: Get all `personId`s from `movie_cast` and `movie_crew` for those movies
3. **Find related movies**: Query movies featuring the same people (excluding already watched)
4. **Rank by relevance**:
   - Number of shared people (more overlap = higher score)
   - Person role importance (director > lead actor > supporting actor)
   - Movie popularity (`vote_average`, `vote_count`)
   - Recency of watch

### Implementation Plan

#### 1. Settings System (1.5 hours)

**New table**: `settings`
```sql
CREATE TABLE settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  value_type VARCHAR(20) NOT NULL,  -- 'boolean', 'string', 'number', 'json'
  description TEXT,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- Initial setting
INSERT INTO settings (key, value, value_type, description)
VALUES ('recommendations.people_based.enabled', 'false', 'boolean', 
        'Enable personalized recommendations based on watched cast/crew');
```

**Benefits**:
- Flexible for future feature flags
- Admin can toggle without code deploy
- Tracks who changed settings and when

#### 2. Recommendation Service (2.5 hours)

**New file**: `api/src/lib/recommendation-service.ts`

```typescript
interface PersonBasedRecommendation {
  movie: Movie;
  reason: {
    sharedPeople: Array<{
      person: Person;
      roleType: 'director' | 'actor' | 'writer' | 'producer';
      fromMovies: number[];  // IDs of watched movies with this person
    }>;
    relevanceScore: number;  // 0-1 score
  };
}

async function getPersonBasedRecommendations(
  userId?: number,
  anonymousId?: string,
  limit: number = 20
): Promise<PersonBasedRecommendation[]>
```

**SQL Query Strategy**:
```sql
WITH watched_movies AS (
  SELECT DISTINCT movie_id 
  FROM watch_progress 
  WHERE (user_id = ? OR anonymous_id = ?) 
    AND progress_percent > 90
),
watched_people AS (
  -- Get actors from watched movies
  SELECT DISTINCT mc.person_id, mc.movie_id, 'actor' as role_type,
         mc.cast_order  -- for importance weighting
  FROM movie_cast mc
  WHERE mc.movie_id IN (SELECT movie_id FROM watched_movies)
  
  UNION ALL
  
  -- Get crew from watched movies
  SELECT DISTINCT mcr.person_id, mcr.movie_id, mcr.job as role_type,
         CASE mcr.job
           WHEN 'Director' THEN 1
           WHEN 'Writer' THEN 2
           WHEN 'Producer' THEN 3
           ELSE 4
         END as importance
  FROM movie_crew mcr
  WHERE mcr.movie_id IN (SELECT movie_id FROM watched_movies)
)
SELECT 
  m.*,
  COUNT(DISTINCT wp.person_id) as shared_people_count,
  -- Weight by person importance
  SUM(CASE 
    WHEN wp.role_type = 'Director' THEN 3.0
    WHEN wp.role_type = 'actor' AND wp.cast_order <= 3 THEN 2.0
    WHEN wp.role_type = 'Writer' THEN 1.5
    ELSE 1.0
  END) as relevance_score
FROM movies m
LEFT JOIN movie_cast mc ON m.id = mc.movie_id
LEFT JOIN movie_crew mcr ON m.id = mcr.movie_id
JOIN watched_people wp ON (mc.person_id = wp.person_id OR mcr.person_id = wp.person_id)
WHERE m.id NOT IN (SELECT movie_id FROM watched_movies)
GROUP BY m.id
HAVING shared_people_count >= 1
ORDER BY relevance_score DESC, m.vote_average DESC
LIMIT ?;
```

#### 3. API Endpoint (1 hour)

**File**: `api/src/routes/recommendations.ts`

```typescript
// GET /api/recommendations/people-based
// Query params: userId OR anonymousId, limit (default 20)
// Returns: PersonBasedRecommendation[]

// Checks settings.recommendations.people_based.enabled first
// Returns 404 or empty array if disabled
```

#### 4. Admin Settings UI (1.5 hours)

**New page**: `web/app/[locale]/admin/settings/page.tsx`

Features:
- List all settings with toggle switches
- Bilingual labels and descriptions
- Save confirmation
- Audit log (who changed what, when)

**Settings card on admin dashboard**:
- Quick toggles for key features
- Link to full settings page

#### 5. Frontend Integration (1.5 hours)

**New hook**: `web/lib/hooks/usePersonalizedRecommendations.ts`
```typescript
export function usePersonalizedRecommendations() {
  // Checks if feature is enabled
  // Fetches from API endpoint
  // Returns recommendations with loading/error states
}
```

**New component**: `web/components/personalized-recommendations.tsx`
- Movie grid with "Because you watched..." context
- Shows shared people with icons (director, actor, etc.)
- Bilingual support

**UI Placement**:
- Homepage section (below featured/trending)
- Movie detail page (sidebar or bottom)
- Dedicated `/recommendations` page (future)

#### 6. Performance Optimization (30 min)

**Challenges**:
- Query can be slow for users with many watched movies
- Needs to run on every page load

**Solutions**:
- Database indexes on `watch_progress.user_id`, `watch_progress.anonymous_id`
- Composite indexes on `movie_cast(person_id, movie_id)`, `movie_crew(person_id, movie_id)`
- Cache results in Redis (5-minute TTL)
- Precompute for active users (background job)

### Data Flow

```
User watches movies → watch_progress table updated
                    ↓
User visits homepage → Frontend checks if feature enabled
                    ↓
If enabled → API fetches watched movies
          → Joins with cast/crew tables
          → Finds movies with shared people
          → Ranks by relevance
          → Returns top 20
                    ↓
Frontend displays → "Because you watched [Movie] with [Actor]"
```

### Benefits

- **Highly personalized**: Based on actual watch history
- **Explainable**: Can show why each movie is recommended
- **Works for anonymous users**: Uses `anonymousId` from watch_progress
- **No new tracking**: Leverages existing watch progress data
- **Admin controlled**: Can be toggled on/off without code deploy

### Challenges & Considerations

**Cold Start Problem**:
- New users have no watch history
- **Solution**: Fall back to trending/popular movies

**Privacy Concerns**:
- Some users may not want tracking
- **Solution**: Respect "Do Not Track" header, add opt-out in user settings

**Performance**:
- Complex queries can be slow
- **Solution**: Caching, indexing, background precomputation

**Recommendation Quality**:
- May over-recommend from same director/actor
- **Solution**: Add diversity factor, limit same-person recommendations

**Bilingual Challenges**:
- Need to show person names in correct language
- **Solution**: Use `getLocalizedText()` for person names from `people_translations`

### Future Enhancements

- **Collaborative filtering**: "Users who watched X also watched Y"
- **Genre preferences**: Weight by user's favorite genres
- **Time decay**: Recent watches weighted higher
- **Negative signals**: Skip movies user started but didn't finish
- **Explanation UI**: "Because you watched 3 movies with [Director]"
- **Diversity controls**: Limit recommendations from same person/genre

### Priority

**Medium-Low** - Nice-to-have feature that improves engagement, but not critical for launch.

**Recommendation**: Implement after core features are stable (auth, rentals, analytics). Good candidate for A/B testing to measure impact on engagement.

**Dependencies**:
- Settings system (can be used for other feature flags too)
- Sufficient watch history data (need active users first)
- Performance monitoring (ensure queries don't slow down homepage)

---

