/**
 * Tests for useMovieForm hook
 */

import { renderHook, act } from '@testing-library/react';
import { useMovieForm } from '../useMovieForm';
import type { Movie } from '@/lib/types';

// Mock the slug utilities
jest.mock('@/lib/slug-utils', () => ({
  sanitizeSlug: (value: string) => value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
  getSlugValidationError: (value: string) => {
    if (!value) return 'Slug is required';
    if (value.length < 3) return 'Slug must be at least 3 characters';
    if (value.startsWith('-') || value.endsWith('-')) return 'Slug cannot start or end with hyphen';
    return null;
  },
}));

describe('useMovieForm', () => {
  describe('initialization', () => {
    it('should initialize with default empty form data', () => {
      const { result } = renderHook(() => useMovieForm());

      expect(result.current.formData.title_en).toBe('');
      expect(result.current.formData.title_lo).toBe('');
      expect(result.current.formData.slug).toBe('');
      expect(result.current.formData.original_language).toBe('lo');
      expect(result.current.formData.status).toBe('Released');
      expect(result.current.slugError).toBeNull();
    });
  });

  describe('handleChange', () => {
    it('should update form field on change', () => {
      const { result } = renderHook(() => useMovieForm());

      act(() => {
        result.current.handleChange({
          target: { name: 'title_en', value: 'Test Movie' },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.formData.title_en).toBe('Test Movie');
    });

    it('should update multiple fields independently', () => {
      const { result } = renderHook(() => useMovieForm());

      act(() => {
        result.current.handleChange({
          target: { name: 'title_en', value: 'English Title' },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      act(() => {
        result.current.handleChange({
          target: { name: 'title_lo', value: 'ຊື່ພາສາລາວ' },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.formData.title_en).toBe('English Title');
      expect(result.current.formData.title_lo).toBe('ຊື່ພາສາລາວ');
    });
  });

  describe('handleSlugChange', () => {
    it('should sanitize slug on change', () => {
      const { result } = renderHook(() => useMovieForm());

      act(() => {
        result.current.handleSlugChange({
          target: { value: 'Test Movie 123!' },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.formData.slug).toBe('test-movie-123-');
    });

    it('should set error for invalid slug', () => {
      const { result } = renderHook(() => useMovieForm());

      act(() => {
        result.current.handleSlugChange({
          target: { value: 'ab' },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.slugError).toBe('Slug must be at least 3 characters');
    });

    it('should clear error for valid slug', () => {
      const { result } = renderHook(() => useMovieForm());

      // First set invalid slug
      act(() => {
        result.current.handleSlugChange({
          target: { value: 'ab' },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.slugError).toBeTruthy();

      // Then set valid slug
      act(() => {
        result.current.handleSlugChange({
          target: { value: 'valid-slug' },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.slugError).toBeNull();
    });
  });

  describe('loadFromMovie', () => {
    it('should populate form from movie object', () => {
      const { result } = renderHook(() => useMovieForm());

      const mockMovie: Partial<Movie> = {
        title: { en: 'Test Movie', lo: 'ທົດສອບ' },
        overview: { en: 'Test overview', lo: 'ພາບລວມ' },
        tagline: { en: 'Test tagline', lo: 'ແທັກໄລນ໌' },
        slug: 'test-movie',
        original_title: 'Original Title',
        original_language: 'en',
        release_date: '2024-01-01',
        runtime: 120,
        vote_average: 8.5,
        status: 'Released',
        budget: 1000000,
        revenue: 5000000,
        homepage: 'https://example.com',
        imdb_id: 'tt1234567',
        poster_path: '/poster.jpg',
        backdrop_path: '/backdrop.jpg',
        video_sources: [
          {
            id: '1',
            url: 'https://example.com/video.m3u8',
            quality: '1080p',
            format: 'hls',
            aspect_ratio: '16:9',
          },
        ],
      } as Movie;

      act(() => {
        result.current.loadFromMovie(mockMovie as Movie);
      });

      expect(result.current.formData.title_en).toBe('Test Movie');
      expect(result.current.formData.title_lo).toBe('ທົດສອບ');
      expect(result.current.formData.slug).toBe('test-movie');
      expect(result.current.formData.runtime).toBe('120');
      expect(result.current.formData.vote_average).toBe('8.5');
      expect(result.current.formData.video_url).toBe('https://example.com/video.m3u8');
      expect(result.current.formData.video_quality).toBe('1080p');
    });

    it('should handle missing optional fields', () => {
      const { result } = renderHook(() => useMovieForm());

      const mockMovie = {
        title: { en: 'Minimal Movie' },
        overview: { en: 'Overview' },
        release_date: '2024-01-01',
        video_sources: [],
      } as unknown as Movie;

      act(() => {
        result.current.loadFromMovie(mockMovie);
      });

      expect(result.current.formData.title_en).toBe('Minimal Movie');
      expect(result.current.formData.title_lo).toBe('');
      expect(result.current.formData.tagline_en).toBe('');
      expect(result.current.formData.runtime).toBe('');
      expect(result.current.formData.video_url).toBe('');
    });
  });

  describe('updateFromSync', () => {
    it('should update English fields from sync while preserving Lao', () => {
      const { result } = renderHook(() => useMovieForm());

      // First load initial data with Lao content
      act(() => {
        result.current.setFormData({
          ...result.current.formData,
          title_en: 'Old Title',
          title_lo: 'ຊື່ເກົ່າ',
          overview_en: 'Old overview',
          overview_lo: 'ພາບລວມເກົ່າ',
        });
      });

      // Then sync with new English data
      const syncedData: Partial<Movie> = {
        title: { en: 'New Title' },
        overview: { en: 'New overview' },
        tagline: { en: 'New tagline' },
        runtime: 150,
      } as Partial<Movie>;

      act(() => {
        result.current.updateFromSync(syncedData);
      });

      // English should be updated
      expect(result.current.formData.title_en).toBe('New Title');
      expect(result.current.formData.overview_en).toBe('New overview');
      expect(result.current.formData.tagline_en).toBe('New tagline');
      expect(result.current.formData.runtime).toBe('150');

      // Lao should be preserved
      expect(result.current.formData.title_lo).toBe('ຊື່ເກົ່າ');
      expect(result.current.formData.overview_lo).toBe('ພາບລວມເກົ່າ');
    });

    it('should handle partial sync data', () => {
      const { result } = renderHook(() => useMovieForm());

      act(() => {
        result.current.setFormData({
          ...result.current.formData,
          title_en: 'Original',
          runtime: '100',
        });
      });

      const syncedData: Partial<Movie> = {
        runtime: 120,
      } as Partial<Movie>;

      act(() => {
        result.current.updateFromSync(syncedData);
      });

      // Only runtime should change
      expect(result.current.formData.title_en).toBe('Original');
      expect(result.current.formData.runtime).toBe('120');
    });
  });

  describe('setFormData', () => {
    it('should allow direct form data updates', () => {
      const { result } = renderHook(() => useMovieForm());

      act(() => {
        result.current.setFormData({
          ...result.current.formData,
          title_en: 'Direct Update',
          slug: 'direct-update',
        });
      });

      expect(result.current.formData.title_en).toBe('Direct Update');
      expect(result.current.formData.slug).toBe('direct-update');
    });
  });
});
