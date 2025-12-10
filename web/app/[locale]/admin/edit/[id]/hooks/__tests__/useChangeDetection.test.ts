/**
 * Tests for useChangeDetection hook
 */

import { renderHook, act } from '@testing-library/react';
import { useChangeDetection } from '../useChangeDetection';
import type { MovieFormData } from '../useMovieForm';
import type { ExternalPlatform, Trailer } from '@/lib/types';

const mockFormData: MovieFormData = {
  title_en: 'Test Movie',
  title_lo: '',
  overview_en: 'Test overview',
  overview_lo: '',
  tagline_en: '',
  tagline_lo: '',
  slug: 'test-movie',
  original_title: 'Test',
  original_language: 'lo',
  release_date: '2024-01-01',
  runtime: '120',
  vote_average: '8.0',
  status: 'Released',
  budget: '',
  revenue: '',
  homepage: '',
  imdb_id: '',
  poster_path: '',
  backdrop_path: '',
  video_url: '',
  video_quality: 'original',
  video_format: 'mp4',
  video_aspect_ratio: '',
};

const mockCastTranslations = {
  '123': { character_en: 'Hero', character_lo: 'ຮີໂຣ' },
};

const mockCrewTranslations = {
  '456-Directing': { job_en: 'Director', job_lo: 'ຜູ້ກຳກັບ' },
};

const mockExternalPlatforms: ExternalPlatform[] = [
  { platform: 'netflix', url: 'https://netflix.com/movie' },
];

const mockTrailers: Trailer[] = [
  {
    id: '1',
    type: 'youtube',
    key: 'abc123',
    name: 'Trailer',
    official: true,
    language: 'en',
    order: 0,
  },
];

describe('useChangeDetection', () => {
  describe('initialization', () => {
    it('should initialize with hasChanges as false', () => {
      const { result } = renderHook(() =>
        useChangeDetection(
          mockFormData,
          mockCastTranslations,
          mockCrewTranslations,
          mockExternalPlatforms,
          'auto',
          mockTrailers
        )
      );

      expect(result.current.hasChanges).toBe(false);
    });
  });

  describe('form data changes', () => {
    it('should detect changes in form data', () => {
      const { result, rerender } = renderHook(
        ({ formData }) =>
          useChangeDetection(
            formData,
            mockCastTranslations,
            mockCrewTranslations,
            mockExternalPlatforms,
            'auto',
            mockTrailers
          ),
        { initialProps: { formData: mockFormData } }
      );

      expect(result.current.hasChanges).toBe(false);

      // Change title
      const updatedFormData = { ...mockFormData, title_en: 'Updated Title' };
      rerender({ formData: updatedFormData });

      expect(result.current.hasChanges).toBe(true);
    });

    it('should detect changes in multiple form fields', () => {
      const { result, rerender } = renderHook(
        ({ formData }) =>
          useChangeDetection(
            formData,
            mockCastTranslations,
            mockCrewTranslations,
            mockExternalPlatforms,
            'auto',
            mockTrailers
          ),
        { initialProps: { formData: mockFormData } }
      );

      const updatedFormData = {
        ...mockFormData,
        title_en: 'New Title',
        runtime: '150',
        slug: 'new-slug',
      };
      rerender({ formData: updatedFormData });

      expect(result.current.hasChanges).toBe(true);
    });
  });

  describe('cast translation changes', () => {
    it('should detect changes in cast translations', () => {
      const { result, rerender } = renderHook(
        ({ castTranslations }) =>
          useChangeDetection(
            mockFormData,
            castTranslations,
            mockCrewTranslations,
            mockExternalPlatforms,
            'auto',
            mockTrailers
          ),
        { initialProps: { castTranslations: mockCastTranslations } }
      );

      expect(result.current.hasChanges).toBe(false);

      // Update cast translation
      const updatedCast = {
        '123': { character_en: 'Villain', character_lo: 'ຮ້າຍ' },
      };
      rerender({ castTranslations: updatedCast });

      expect(result.current.hasChanges).toBe(true);
    });

    it('should detect added cast members', () => {
      const { result, rerender } = renderHook(
        ({ castTranslations }) =>
          useChangeDetection(
            mockFormData,
            castTranslations,
            mockCrewTranslations,
            mockExternalPlatforms,
            'auto',
            mockTrailers
          ),
        { initialProps: { castTranslations: mockCastTranslations } }
      );

      const updatedCast = {
        ...mockCastTranslations,
        '789': { character_en: 'Sidekick', character_lo: 'ຜູ້ຊ່ວຍ' },
      };
      rerender({ castTranslations: updatedCast });

      expect(result.current.hasChanges).toBe(true);
    });
  });

  describe('crew translation changes', () => {
    it('should detect changes in crew translations', () => {
      const { result, rerender } = renderHook(
        ({ crewTranslations }) =>
          useChangeDetection(
            mockFormData,
            mockCastTranslations,
            crewTranslations,
            mockExternalPlatforms,
            'auto',
            mockTrailers
          ),
        { initialProps: { crewTranslations: mockCrewTranslations } }
      );

      const updatedCrew = {
        '456-Directing': { job_en: 'Co-Director', job_lo: 'ຜູ້ກຳກັບຮ່ວມ' },
      };
      rerender({ crewTranslations: updatedCrew });

      expect(result.current.hasChanges).toBe(true);
    });
  });

  describe('external platforms changes', () => {
    it('should detect changes in external platforms', () => {
      const { result, rerender } = renderHook(
        ({ platforms }) =>
          useChangeDetection(
            mockFormData,
            mockCastTranslations,
            mockCrewTranslations,
            platforms,
            'auto',
            mockTrailers
          ),
        { initialProps: { platforms: mockExternalPlatforms } }
      );

      const updatedPlatforms: ExternalPlatform[] = [
        { platform: 'prime', url: 'https://prime.com/movie' },
      ];
      rerender({ platforms: updatedPlatforms });

      expect(result.current.hasChanges).toBe(true);
    });

    it('should detect added platforms', () => {
      const { result, rerender } = renderHook(
        ({ platforms }) =>
          useChangeDetection(
            mockFormData,
            mockCastTranslations,
            mockCrewTranslations,
            platforms,
            'auto',
            mockTrailers
          ),
        { initialProps: { platforms: mockExternalPlatforms } }
      );

      const updatedPlatforms = [
        ...mockExternalPlatforms,
        { platform: 'disney' as const, url: 'https://disney.com/movie' },
      ];
      rerender({ platforms: updatedPlatforms });

      expect(result.current.hasChanges).toBe(true);
    });
  });

  describe('availability status changes', () => {
    it('should detect changes in availability status', () => {
      const { result, rerender } = renderHook(
        ({ status }) =>
          useChangeDetection(
            mockFormData,
            mockCastTranslations,
            mockCrewTranslations,
            mockExternalPlatforms,
            status,
            mockTrailers
          ),
        { initialProps: { status: 'auto' } }
      );

      rerender({ status: 'available' });

      expect(result.current.hasChanges).toBe(true);
    });
  });

  describe('trailers changes', () => {
    it('should detect changes in trailers', () => {
      const { result, rerender } = renderHook(
        ({ trailers }) =>
          useChangeDetection(
            mockFormData,
            mockCastTranslations,
            mockCrewTranslations,
            mockExternalPlatforms,
            'auto',
            trailers
          ),
        { initialProps: { trailers: mockTrailers } }
      );

      const updatedTrailers: Trailer[] = [
        {
          id: '2',
          type: 'youtube',
          key: 'xyz789',
          name: 'New Trailer',
          official: true,
          language: 'en',
          order: 0,
        },
      ];
      rerender({ trailers: updatedTrailers });

      expect(result.current.hasChanges).toBe(true);
    });

    it('should detect added trailers', () => {
      const { result, rerender } = renderHook(
        ({ trailers }) =>
          useChangeDetection(
            mockFormData,
            mockCastTranslations,
            mockCrewTranslations,
            mockExternalPlatforms,
            'auto',
            trailers
          ),
        { initialProps: { trailers: mockTrailers } }
      );

      const updatedTrailers = [
        ...mockTrailers,
        {
          id: '2',
          type: 'youtube' as const,
          key: 'def456',
          name: 'Trailer 2',
          official: false,
          language: 'lo',
          order: 1,
        },
      ];
      rerender({ trailers: updatedTrailers });

      expect(result.current.hasChanges).toBe(true);
    });
  });

  describe('multiple changes', () => {
    it('should detect changes across multiple data types', () => {
      const { result, rerender } = renderHook(
        ({ formData, castTranslations, status }) =>
          useChangeDetection(
            formData,
            castTranslations,
            mockCrewTranslations,
            mockExternalPlatforms,
            status,
            mockTrailers
          ),
        {
          initialProps: {
            formData: mockFormData,
            castTranslations: mockCastTranslations,
            status: 'auto',
          },
        }
      );

      expect(result.current.hasChanges).toBe(false);

      // Change multiple things
      rerender({
        formData: { ...mockFormData, title_en: 'New Title' },
        castTranslations: {
          '123': { character_en: 'New Character', character_lo: '' },
        },
        status: 'available',
      });

      expect(result.current.hasChanges).toBe(true);
    });
  });

  describe('updateOriginals', () => {
    it('should reset hasChanges after updating originals', () => {
      const { result, rerender } = renderHook(
        ({ formData }) =>
          useChangeDetection(
            formData,
            mockCastTranslations,
            mockCrewTranslations,
            mockExternalPlatforms,
            'auto',
            mockTrailers
          ),
        { initialProps: { formData: mockFormData } }
      );

      // Make a change
      const updatedFormData = { ...mockFormData, title_en: 'Changed' };
      rerender({ formData: updatedFormData });
      expect(result.current.hasChanges).toBe(true);

      // Update originals (simulating successful save)
      act(() => {
        result.current.updateOriginals(
          updatedFormData,
          mockCastTranslations,
          mockCrewTranslations,
          mockExternalPlatforms,
          'auto',
          mockTrailers
        );
      });

      expect(result.current.hasChanges).toBe(false);
    });

    it('should track new changes after updating originals', () => {
      const { result, rerender } = renderHook(
        ({ formData }) =>
          useChangeDetection(
            formData,
            mockCastTranslations,
            mockCrewTranslations,
            mockExternalPlatforms,
            'auto',
            mockTrailers
          ),
        { initialProps: { formData: mockFormData } }
      );

      // First change and save
      const firstUpdate = { ...mockFormData, title_en: 'First Change' };
      rerender({ formData: firstUpdate });
      act(() => {
        result.current.updateOriginals(
          firstUpdate,
          mockCastTranslations,
          mockCrewTranslations,
          mockExternalPlatforms,
          'auto',
          mockTrailers
        );
      });
      expect(result.current.hasChanges).toBe(false);

      // Second change
      const secondUpdate = { ...firstUpdate, title_en: 'Second Change' };
      rerender({ formData: secondUpdate });
      expect(result.current.hasChanges).toBe(true);
    });
  });

  describe('setHasChanges', () => {
    it('should allow manual control of hasChanges flag', () => {
      const { result } = renderHook(() =>
        useChangeDetection(
          mockFormData,
          mockCastTranslations,
          mockCrewTranslations,
          mockExternalPlatforms,
          'auto',
          mockTrailers
        )
      );

      expect(result.current.hasChanges).toBe(false);

      act(() => {
        result.current.setHasChanges(true);
      });
      expect(result.current.hasChanges).toBe(true);

      act(() => {
        result.current.setHasChanges(false);
      });
      expect(result.current.hasChanges).toBe(false);
    });
  });
});
