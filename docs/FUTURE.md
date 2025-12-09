
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

