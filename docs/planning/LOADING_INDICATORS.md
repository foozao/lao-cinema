# Loading Indicators

## Problem
On mobile devices and slow connections, SPA navigation appears stuck because there's no visual feedback during page transitions.

## Loading Indicators

Implemented a **hybrid loading system** that balances performance and UX:
- **Top progress bar** for instant navigation feedback
- **Delayed spinners** for data fetching (300ms delay to prevent flashes)
- **No full-page skeletons** to eliminate layout flash on fast connections

## Strategy

### Hybrid Approach Benefits
1. **Fast loads (<300ms)**: No loading state shown - instant experience
2. **Slow loads (>300ms)**: Spinner appears after brief delay
3. **Navigation feedback**: Top progress bar always visible during route changes
4. **No flash**: Eliminates annoying skeleton/spinner flash on fast connections

## Components

### 1. Top Progress Bar (Global)
- **Component**: `ProgressBarProvider`
- **Location**: Root layout (`app/[locale]/layout.tsx`)
- **Appearance**: Thin red bar (3px) at top of viewport
- **Behavior**: Shows during all client-side navigation
- **Color**: `#ef4444` (red-500) to match brand
- **Animation**: 0% → 100% over 1s, stays visible for 1.2s total

### 2. Delayed Loading Spinner
Custom hook (`useDelayedLoading`) that prevents loading state flash on fast connections.

**Hook**: `lib/hooks/use-delayed-loading.ts`

**Usage:**
```tsx
import { useDelayedLoading } from '@/lib/hooks/use-delayed-loading';

function MyPage() {
  const [loading, setLoading] = useState(true);
  const showLoading = useDelayedLoading(loading, 300); // 300ms delay
  
  if (showLoading) {
    return <LoadingSpinner size="lg" text="Loading..." />;
  }
  
  return <Content />;
}
```

**How It Works:**
1. Data fetching starts (`loading = true`)
2. Hook waits 300ms before setting `showLoading = true`
3. If data loads in <300ms: No loading spinner shown (instant!)
4. If data takes >300ms: Spinner appears smoothly
5. When complete: Spinner disappears immediately

**Applied To:**
- Home page (featured films loading)
- Movies list (all movies + search)
- Movie detail (movie data + rental check)
- People detail (person data + filmography)
- Cast & crew page
- Watch page (video + rental validation)
- Admin pages (analytics, movies, people)

## How It Works

### Navigation Flow
When user clicks a link:
1. **Instant (0ms)**: Top progress bar starts animating (red bar at top)
2. **Fast load (<300ms)**: Content appears, no spinner shown 
3. **Slow load (>300ms)**: Spinner appears after 300ms delay
4. **Complete**: Content replaces loading state immediately

### Benefits
- **No flash on fast connections** - Most loads complete in <300ms
- **Clear feedback on slow loads** - Spinner appears after brief delay
- **Instant navigation feedback** - Progress bar always visible
- **Simple maintenance** - No skeleton layouts to keep in sync
- **Better perceived performance** - Feels faster than skeletons

### Comparison to Full-Page Skeletons
| Aspect | Hybrid (Delayed Spinner) | Full-Page Skeleton |
|--------|-------------------------|-------------------|
| Fast loads (<300ms) | Instant, no flash | Skeleton flash |
| Slow loads (>300ms) | Smooth spinner | Skeleton appears |
| Maintenance | Simple hook | Multiple loading.tsx files |
| Layout accuracy | N/A (no skeleton) | Often mismatched |
| Perceived speed | | |

## Testing

### Chrome DevTools Network Throttling
1. Open DevTools → Network tab
2. Set throttling to "Slow 3G" or "Fast 3G"
3. Navigate between pages
4. Observe progress bar + skeleton states

### Mobile Testing
1. Test on actual device with slow connection
2. Click navigation links
3. Verify progress bar appears at top
4. Verify skeleton matches destination page

## Customization

### Change Progress Bar Color
Edit `app/[locale]/layout.tsx`:
```tsx
<ProgressBar
  height="3px"
  color="#YOUR_COLOR" // Change this
  options={{ showSpinner: false }}
  shallowRouting
/>
```

### Adjust Skeleton Animations
All skeletons use Tailwind's `animate-pulse` utility. To customize:
- Edit individual `loading.tsx` files
- Adjust skeleton structure to match page layout
- Change colors (currently `bg-zinc-800`)

## Alternative Solutions Considered

1. **Full-page spinner**: Too generic, doesn't match content
2. **Route-based spinners**: Less context than skeletons
3. **Optimistic UI only**: Doesn't help with actual slow loads
4. **Manual loading states**: More complex, error-prone

## Browser Compatibility
- ✅ Chrome/Edge (Chromium)
- ✅ Safari (iOS/macOS)
- ✅ Firefox
- ✅ Mobile browsers (iOS Safari, Chrome Android)

## Performance Impact
- **Bundle size**: +8KB (next-nprogress-bar)
- **Runtime**: Negligible (CSS animations)
- **First load**: No impact (progress bar only shows on navigation)

## Components

### LoadingSpinner (`components/loading-spinner.tsx`)
Reusable loading spinner component with brand styling.

**Props:**
- `size?: 'sm' | 'md' | 'lg'` - Spinner size (default: 'md')
- `text?: string` - Optional loading message with animated dots

**Features:**
- Spinning Film icon (Lucide) in brand red
- Animated dots (bouncing with staggered delays)
- Responsive sizes (8px, 12px, 16px)

**Usage:**
```tsx
import { LoadingSpinner } from '@/components/loading-spinner';

<LoadingSpinner size="lg" text="Loading movies" />
```

### ProgressBarProvider (`components/progress-bar.tsx`)
Global route transition progress bar.

**How it works:**
- Listens to `usePathname()` and `useSearchParams()` changes
- Displays red bar at top with CSS animation
- 1s animation (0% → 40% → 80% → 100%)
- Visible for 1.2s total, then fades out

**Included in:** Root layout (`app/[locale]/layout.tsx`)

## CSS Utilities

### Shimmer Effect (`globals.css`)
Professional loading animation (Facebook/LinkedIn style).

**Class:** `.shimmer`

**Animation:**
- Linear gradient sweeping left to right
- Colors: zinc-900 → zinc-800 → zinc-900
- Duration: 1.5s infinite
- 200% background size for smooth movement

**Usage:**
```tsx
<div className="bg-zinc-800 rounded shimmer" />
```

## Future Enhancements
- [ ] Add loading states for admin pages
- [ ] Implement optimistic UI for form submissions
- [ ] Add skeleton for people/cast pages
- [ ] Consider route prefetching hints for common paths
- [ ] Add loading state for search results
