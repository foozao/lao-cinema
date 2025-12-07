# Mobile Fullscreen Fix

## Problem
The fullscreen button wasn't working on mobile Chrome (Android). Clicking the fullscreen icon did nothing.

## Root Cause
Mobile browsers handle fullscreen differently than desktop:
- **Desktop browsers**: Can make any container element fullscreen (better for custom controls)
- **Mobile browsers**: Require `requestFullscreen()` to be called on the `<video>` element itself
- **iOS Safari**: Uses proprietary `webkitEnterFullscreen()` method instead of standard API
- **Android Chrome**: Supports standard `requestFullscreen()` but on video element only

## Solution Implemented

### 1. Mobile Detection & Element Selection
The `toggleFullscreen()` function now:
- Detects mobile devices using user agent
- On mobile: calls `requestFullscreen()` on the video element
- On desktop: calls `requestFullscreen()` on the container (preserves custom controls)

### 2. Cross-Browser Compatibility
Added fallbacks for all browser-specific APIs:
```typescript
// iOS Safari
video.webkitEnterFullscreen()

// Standard API
video.requestFullscreen()

// Older webkit browsers
video.webkitRequestFullscreen()

// Firefox
video.mozRequestFullScreen()

// IE/Edge
video.msRequestFullscreen()
```

### 3. Enhanced Event Listeners
Listen to all fullscreen events across browsers:
- `fullscreenchange` (standard)
- `webkitfullscreenchange` (Chrome/Safari)
- `mozfullscreenchange` (Firefox)
- `MSFullscreenChange` (IE/Edge)
- `webkitbeginfullscreen` (iOS Safari video element)
- `webkitendfullscreen` (iOS Safari video element)

### 4. Video Element Attributes
Added mobile-specific attributes:
```tsx
<video
  playsInline                    // Prevents auto-fullscreen on iOS
  webkit-playsinline="true"      // iOS compatibility
  x-webkit-airplay="allow"       // AirPlay support
  controlsList="nodownload"      // Hide download button
/>
```

### 5. Mobile Height Optimization
Fixed excessive black space on mobile by adjusting container heights:
- **Video player container**: Only apply `h-[calc(100vh-64px)]` on desktop (`md:h-[calc(100vh-64px)]`)
- **Watch page wrapper**: Only use `flex-1` on desktop (`md:flex-1`)
- **Mobile behavior**: Video height determined by aspect ratio, not viewport height
- **Desktop behavior**: Video constrained to viewport height with flex layout

## Files Modified
- `web/components/video-player.tsx` - Fullscreen implementation and mobile height fix
- `web/app/[locale]/movies/[id]/watch/page.tsx` - Mobile layout adjustments

## Testing Checklist

### Android Chrome
- [ ] Fullscreen button enters fullscreen
- [ ] Video fills entire screen
- [ ] Device back button exits fullscreen
- [ ] Orientation changes work correctly
- [ ] Play/pause controls visible in fullscreen
- [ ] No excessive black space above/below video on page load
- [ ] Video height is appropriate for screen size

### iOS Safari
- [ ] Fullscreen button enters native fullscreen
- [ ] Video uses iOS native fullscreen player
- [ ] Done button exits fullscreen
- [ ] AirPlay icon visible (when AirPlay devices available)

### Desktop Chrome/Firefox/Safari
- [ ] Fullscreen button enters fullscreen
- [ ] Custom controls remain visible
- [ ] ESC key exits fullscreen
- [ ] F11 key still works independently

## Technical Notes

### Why Different Elements?
- **Mobile video element fullscreen**: Mobile browsers have strict security policies and only allow video element fullscreen. This also provides better native controls and gesture support.
- **Desktop container fullscreen**: Allows custom controls overlay to remain visible and functional in fullscreen mode.

### iOS Safari Specifics
- No programmatic exit from fullscreen - user must tap "Done"
- Native fullscreen player takes over (custom controls hidden)
- Supports AirPlay natively in fullscreen mode

### User Agent Detection
```typescript
/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
```
Simple but effective. Could be enhanced with feature detection if needed:
```typescript
const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
```

## Known Limitations

1. **iOS Safari Custom Controls**: In fullscreen, iOS shows its native player controls. Our custom controls are hidden. This is by design and cannot be overridden.

2. **Orientation Lock**: Some Android devices may lock orientation when entering fullscreen. This is device/browser-specific behavior.

3. **Exit Fullscreen on iOS**: Users must manually tap "Done" - no programmatic exit available in iOS Safari.

## Future Enhancements

1. **Feature Detection**: Replace user agent sniffing with feature detection
2. **Orientation API**: Add orientation change handlers for better UX
3. **Picture-in-Picture**: Add PiP support for mobile browsers that support it
4. **Screen Orientation Lock**: Lock to landscape in fullscreen on mobile

## References

- [MDN: Fullscreen API](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API)
- [Can I Use: Fullscreen API](https://caniuse.com/fullscreen)
- [iOS Safari Video Policies](https://webkit.org/blog/6784/new-video-policies-for-ios/)
