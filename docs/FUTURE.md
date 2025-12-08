
Possible Future Changes:

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


