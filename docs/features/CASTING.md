# Video Casting Support

## Overview

The Lao Cinema platform supports casting videos to TVs with platform-specific implementations:

- **Android**: Google Cast (Chromecast)
- **iOS**: AirPlay (native Safari support)

## Platform Support

### Android (Google Cast)

**Supported Browsers:**
- Chrome
- Edge
- Other Chromium-based browsers

**Features:**
- Cast icon appears in video player controls when Chromecast devices are detected
- Supports HLS streaming to Chromecast
- Maintains playback position when switching between local and cast playback
- Shows device name when connected

**Requirements:**
- Phone and Chromecast must be on the same network
- Network must allow mDNS/UPnP (no AP isolation)
- HTTPS required in production

### iOS (AirPlay)

**Supported Browsers:**
- Safari (all iOS browsers use Safari's WebKit engine)

**Features:**
- AirPlay button appears automatically in Safari's native video controls
- No custom implementation needed - handled by iOS
- Works with Apple TV and AirPlay-compatible devices

**Implementation:**
- Video element has `x-webkit-airplay="allow"` attribute
- Google Cast button is hidden on iOS devices (not supported by Apple)

## Technical Implementation

### Google Cast SDK

The Google Cast SDK is loaded via script tag in the app layout:

```typescript
// web/app/[locale]/layout.tsx
<script src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1" async></script>
```

### Cast Hook

The `useGoogleCast` hook handles all Google Cast functionality:

```typescript
// web/lib/video/use-google-cast.ts
const {
  isCastAvailable,  // True when Chromecast devices are found (false on iOS)
  isCasting,        // True when actively casting
  toggleCasting,    // Start/stop casting
  castError,        // Error messages for user
} = useGoogleCast({ videoRef, src, title, poster });
```

**iOS Detection:**
The hook automatically detects iOS devices and skips initialization:

```typescript
const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
if (isIOS) {
  console.log('📱 iOS device detected - use AirPlay instead');
  return; // Skip Google Cast initialization
}
```

### Video Player Integration

The VideoPlayer component integrates both casting methods:

```typescript
// Google Cast (Android)
const { isCastAvailable, isCasting, toggleCasting } = useGoogleCast({...});

// AirPlay (iOS) - enabled via video attributes
<video x-webkit-airplay="allow" ... />
```

Cast button only appears when `isCastAvailable` is true (Android with devices found).

## User Experience

### Android Users
1. Open video on phone
2. Cast icon appears in video controls (bottom-right)
3. Tap cast icon → select Chromecast device
4. Video plays on TV, phone becomes remote control
5. Tap cast icon again to disconnect

### iOS Users
1. Open video in Safari
2. Tap video to show native controls
3. AirPlay icon appears in Safari's controls (if AirPlay devices available)
4. Tap AirPlay icon → select Apple TV or AirPlay device
5. Video plays on TV

## Error Handling

### Common Errors

**"Casting is not available. Please make sure you are using Chrome or Edge browser."**
- User is on unsupported browser (Firefox, Safari on Android)
- Solution: Use Chrome or Edge

**"Cast SDK not loaded. Try refreshing the page or check if the script is blocked."**
- Google Cast SDK failed to load
- Possible causes: Network blocking Google CDN, ad blocker, slow connection
- Solution: Refresh page, disable ad blocker, check network

**"Connection timed out. Make sure your TV is on the same network."**
- Phone and Chromecast on different networks/subnets
- Solution: Connect to same Wi-Fi network, disable AP isolation

**"Unable to load video on your TV. The video format may not be supported."**
- Video format not compatible with Chromecast
- HLS should work, but some codecs may not be supported

## Development & Testing

### Testing Google Cast (Android)

**Requirements:**
- Android phone with Chrome
- Chromecast or Google TV device
- Both on same network

**Testing locally:**
1. Ensure development server uses HTTPS or is on `localhost`
2. Open watch page in Chrome on Android
3. Cast icon should appear if devices are detected
4. Click to test casting

**Debug logging:**
All Cast-related logs are prefixed with emoji:
- 🎬 - General Cast info
- ✅ - Success
- ❌ - Error
- 🔍 - Debug state
- 📱 - iOS detection

### Testing AirPlay (iOS)

**Requirements:**
- iPhone/iPad
- Apple TV or AirPlay-compatible device
- Both on same network

**Testing:**
1. Open watch page in Safari
2. Tap video to show controls
3. AirPlay icon should appear in native controls
4. Tap to test AirPlay

### Debug Panel

For mobile debugging without DevTools, add `?debug=true` to the URL:

```
https://lao-cinema-web-3ra6tqt7cq-as.a.run.app/en/movies/123/watch?debug=true
```

This shows an on-screen debug panel with all Cast-related console logs.

## Known Limitations

### iOS
- ❌ Google Cast not supported (Apple restriction)
- ❌ Custom cast UI not possible
- ✅ AirPlay works automatically via Safari

### Android
- ✅ Google Cast fully supported
- ⚠️ Requires Chrome/Edge browser
- ⚠️ Network configuration must allow device discovery

### General
- Both phone and TV must be on same network
- Guest networks often have AP isolation enabled (blocks casting)
- VPNs may interfere with device discovery
- HTTPS required in production

## Future Enhancements

Potential improvements:
- [ ] Remember last used cast device
- [ ] Show cast queue for multiple videos
- [ ] Support casting from mobile app (React Native)
- [ ] Add cast analytics tracking
- [ ] Implement custom receiver app for better branding

## References

- [Google Cast SDK Documentation](https://developers.google.com/cast/docs/web_sender)
- [Apple AirPlay Documentation](https://developer.apple.com/airplay/)
- [HLS Streaming Specification](https://developer.apple.com/streaming/)
