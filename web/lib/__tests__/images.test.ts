import { describe, it, expect } from '@jest/globals';
import {
  getImageUrl,
  getPosterUrl,
  getBackdropUrl,
  getProfileUrl,
  isTMDBImage,
  getPlaceholderUrl,
} from '../images';

describe('image utilities', () => {
  describe('getImageUrl', () => {
    describe('TMDB images', () => {
      it('should construct poster URL with medium size', () => {
        const result = getImageUrl('/abc123.jpg', 'poster', 'medium');
        expect(result).toBe('https://image.tmdb.org/t/p/w500/abc123.jpg');
      });

      it('should construct poster URL with small size', () => {
        const result = getImageUrl('/abc123.jpg', 'poster', 'small');
        expect(result).toBe('https://image.tmdb.org/t/p/w185/abc123.jpg');
      });

      it('should construct poster URL with large size', () => {
        const result = getImageUrl('/abc123.jpg', 'poster', 'large');
        expect(result).toBe('https://image.tmdb.org/t/p/w780/abc123.jpg');
      });

      it('should construct poster URL with original size', () => {
        const result = getImageUrl('/abc123.jpg', 'poster', 'original');
        expect(result).toBe('https://image.tmdb.org/t/p/original/abc123.jpg');
      });

      it('should construct backdrop URL with medium size', () => {
        const result = getImageUrl('/backdrop.jpg', 'backdrop', 'medium');
        expect(result).toBe('https://image.tmdb.org/t/p/w780/backdrop.jpg');
      });

      it('should construct backdrop URL with small size', () => {
        const result = getImageUrl('/backdrop.jpg', 'backdrop', 'small');
        expect(result).toBe('https://image.tmdb.org/t/p/w300/backdrop.jpg');
      });

      it('should construct backdrop URL with large size', () => {
        const result = getImageUrl('/backdrop.jpg', 'backdrop', 'large');
        expect(result).toBe('https://image.tmdb.org/t/p/w1280/backdrop.jpg');
      });

      it('should construct profile URL with medium size', () => {
        const result = getImageUrl('/profile.jpg', 'profile', 'medium');
        expect(result).toBe('https://image.tmdb.org/t/p/w185/profile.jpg');
      });

      it('should construct profile URL with small size', () => {
        const result = getImageUrl('/profile.jpg', 'profile', 'small');
        expect(result).toBe('https://image.tmdb.org/t/p/w45/profile.jpg');
      });

      it('should construct profile URL with large size', () => {
        const result = getImageUrl('/profile.jpg', 'profile', 'large');
        expect(result).toBe('https://image.tmdb.org/t/p/h632/profile.jpg');
      });
    });

    describe('custom hosted images', () => {
      it('should return https URL as-is', () => {
        const url = 'https://cdn.example.com/image.jpg';
        const result = getImageUrl(url, 'poster', 'medium');
        expect(result).toBe(url);
      });

      it('should return http URL as-is', () => {
        const url = 'http://cdn.example.com/image.jpg';
        const result = getImageUrl(url, 'poster', 'medium');
        expect(result).toBe(url);
      });

      it('should ignore type and size for custom URLs', () => {
        const url = 'https://cdn.example.com/image.jpg';
        const result1 = getImageUrl(url, 'poster', 'small');
        const result2 = getImageUrl(url, 'backdrop', 'large');
        expect(result1).toBe(url);
        expect(result2).toBe(url);
      });
    });

    describe('null/undefined handling', () => {
      it('should return null for null path', () => {
        const result = getImageUrl(null, 'poster', 'medium');
        expect(result).toBeNull();
      });

      it('should return null for undefined path', () => {
        const result = getImageUrl(undefined, 'poster', 'medium');
        expect(result).toBeNull();
      });

      it('should return null for empty string', () => {
        const result = getImageUrl('', 'poster', 'medium');
        expect(result).toBeNull();
      });
    });

    describe('default parameters', () => {
      it('should default to poster type and medium size', () => {
        const result = getImageUrl('/test.jpg');
        expect(result).toBe('https://image.tmdb.org/t/p/w500/test.jpg');
      });
    });
  });

  describe('getPosterUrl', () => {
    it('should return poster URL with specified size', () => {
      const result = getPosterUrl('/poster.jpg', 'large');
      expect(result).toBe('https://image.tmdb.org/t/p/w780/poster.jpg');
    });

    it('should default to medium size', () => {
      const result = getPosterUrl('/poster.jpg');
      expect(result).toBe('https://image.tmdb.org/t/p/w500/poster.jpg');
    });

    it('should handle null', () => {
      const result = getPosterUrl(null);
      expect(result).toBeNull();
    });

    it('should handle custom URLs', () => {
      const url = 'https://custom.com/poster.jpg';
      const result = getPosterUrl(url);
      expect(result).toBe(url);
    });
  });

  describe('getBackdropUrl', () => {
    it('should return backdrop URL with specified size', () => {
      const result = getBackdropUrl('/backdrop.jpg', 'large');
      expect(result).toBe('https://image.tmdb.org/t/p/w1280/backdrop.jpg');
    });

    it('should default to medium size', () => {
      const result = getBackdropUrl('/backdrop.jpg');
      expect(result).toBe('https://image.tmdb.org/t/p/w780/backdrop.jpg');
    });

    it('should handle null', () => {
      const result = getBackdropUrl(null);
      expect(result).toBeNull();
    });
  });

  describe('getProfileUrl', () => {
    it('should return profile URL with specified size', () => {
      const result = getProfileUrl('/profile.jpg', 'small');
      expect(result).toBe('https://image.tmdb.org/t/p/w45/profile.jpg');
    });

    it('should default to medium size', () => {
      const result = getProfileUrl('/profile.jpg');
      expect(result).toBe('https://image.tmdb.org/t/p/w185/profile.jpg');
    });

    it('should handle null', () => {
      const result = getProfileUrl(null);
      expect(result).toBeNull();
    });
  });

  describe('isTMDBImage', () => {
    it('should return true for TMDB paths', () => {
      expect(isTMDBImage('/abc123.jpg')).toBe(true);
      expect(isTMDBImage('/path/to/image.png')).toBe(true);
    });

    it('should return false for custom URLs', () => {
      expect(isTMDBImage('https://cdn.example.com/image.jpg')).toBe(false);
      expect(isTMDBImage('http://cdn.example.com/image.jpg')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isTMDBImage(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isTMDBImage(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isTMDBImage('')).toBe(false);
    });

    it('should return false for relative paths without leading slash', () => {
      expect(isTMDBImage('image.jpg')).toBe(false);
      expect(isTMDBImage('path/to/image.jpg')).toBe(false);
    });
  });

  describe('getPlaceholderUrl', () => {
    it('should return poster placeholder by default', () => {
      const result = getPlaceholderUrl();
      expect(result).toBe('/placeholder-poster.png');
    });

    it('should return poster placeholder when specified', () => {
      const result = getPlaceholderUrl('poster');
      expect(result).toBe('/placeholder-poster.png');
    });

    it('should return backdrop placeholder when specified', () => {
      const result = getPlaceholderUrl('backdrop');
      expect(result).toBe('/placeholder-backdrop.png');
    });

    it('should return profile placeholder when specified', () => {
      const result = getPlaceholderUrl('profile');
      expect(result).toBe('/placeholder-profile.png');
    });
  });

  describe('edge cases', () => {
    it('should handle paths with special characters', () => {
      const result = getImageUrl('/image-with-dashes_and_underscores.jpg', 'poster', 'medium');
      expect(result).toBe('https://image.tmdb.org/t/p/w500/image-with-dashes_and_underscores.jpg');
    });

    it('should handle paths with query parameters (custom URL)', () => {
      const url = 'https://cdn.example.com/image.jpg?size=large&quality=high';
      const result = getImageUrl(url, 'poster', 'medium');
      expect(result).toBe(url);
    });

    it('should handle paths with fragments (custom URL)', () => {
      const url = 'https://cdn.example.com/image.jpg#section';
      const result = getImageUrl(url, 'poster', 'medium');
      expect(result).toBe(url);
    });
  });
});
