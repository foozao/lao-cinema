/**
 * Tests for availability status logic
 * Ensures 'auto' status correctly determines availability based on video sources and external platforms
 */

describe('Availability Status Logic', () => {
  // Simulates the logic from /app/[locale]/movies/[id]/page.tsx lines 158-173
  function determineAvailability(
    availabilityStatus: string | null | undefined,
    hasVideoSources: boolean,
    hasExternalPlatforms: boolean
  ): {
    isAvailableOnSite: boolean;
    hasExternalPlatforms: boolean;
    isComingSoon: boolean;
    isUnavailable: boolean;
  } {
    let status = availabilityStatus;
    
    // Handle 'auto' mode - determine availability based on what's available
    if (!status || status === 'auto') {
      if (hasVideoSources) {
        status = 'available';
      } else if (hasExternalPlatforms) {
        status = 'external';
      } else {
        status = 'unavailable';
      }
    }

    return {
      isAvailableOnSite: status === 'available' && hasVideoSources,
      hasExternalPlatforms: status === 'external' && hasExternalPlatforms,
      isComingSoon: status === 'coming_soon',
      isUnavailable: status === 'unavailable',
    };
  }

  describe('Auto Availability Status', () => {
    it('should show Watch Now when status is "auto" and video sources exist', () => {
      const result = determineAvailability('auto', true, false);
      expect(result.isAvailableOnSite).toBe(true);
      expect(result.hasExternalPlatforms).toBe(false);
      expect(result.isComingSoon).toBe(false);
      expect(result.isUnavailable).toBe(false);
    });

    it('should show Watch Now when status is null and video sources exist', () => {
      const result = determineAvailability(null, true, false);
      expect(result.isAvailableOnSite).toBe(true);
      expect(result.hasExternalPlatforms).toBe(false);
    });

    it('should show Watch Now when status is undefined and video sources exist', () => {
      const result = determineAvailability(undefined, true, false);
      expect(result.isAvailableOnSite).toBe(true);
      expect(result.hasExternalPlatforms).toBe(false);
    });

    it('should show external platforms when status is "auto" and only external platforms exist', () => {
      const result = determineAvailability('auto', false, true);
      expect(result.isAvailableOnSite).toBe(false);
      expect(result.hasExternalPlatforms).toBe(true);
      expect(result.isComingSoon).toBe(false);
      expect(result.isUnavailable).toBe(false);
    });

    it('should show unavailable when status is "auto" and no sources exist', () => {
      const result = determineAvailability('auto', false, false);
      expect(result.isAvailableOnSite).toBe(false);
      expect(result.hasExternalPlatforms).toBe(false);
      expect(result.isComingSoon).toBe(false);
      expect(result.isUnavailable).toBe(true);
    });
  });

  describe('Explicit Availability Status', () => {
    it('should show Watch Now when status is "available" with video sources', () => {
      const result = determineAvailability('available', true, false);
      expect(result.isAvailableOnSite).toBe(true);
    });

    it('should NOT show Watch Now when status is "available" but no video sources', () => {
      const result = determineAvailability('available', false, false);
      expect(result.isAvailableOnSite).toBe(false);
    });

    it('should show external platforms when status is "external"', () => {
      const result = determineAvailability('external', false, true);
      expect(result.hasExternalPlatforms).toBe(true);
      expect(result.isAvailableOnSite).toBe(false);
    });

    it('should show coming soon when status is "coming_soon"', () => {
      const result = determineAvailability('coming_soon', true, false);
      expect(result.isComingSoon).toBe(true);
      expect(result.isAvailableOnSite).toBe(false);
    });

    it('should show unavailable when status is "unavailable"', () => {
      const result = determineAvailability('unavailable', true, false);
      expect(result.isUnavailable).toBe(true);
      expect(result.isAvailableOnSite).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should prioritize explicit status over auto-detection', () => {
      // Even with video sources, if status is "unavailable", it should be unavailable
      const result = determineAvailability('unavailable', true, false);
      expect(result.isUnavailable).toBe(true);
      expect(result.isAvailableOnSite).toBe(false);
    });

    it('should handle both video sources and external platforms with auto status', () => {
      // When both exist, video sources take priority
      const result = determineAvailability('auto', true, true);
      expect(result.isAvailableOnSite).toBe(true);
      expect(result.hasExternalPlatforms).toBe(false);
    });
  });
});
