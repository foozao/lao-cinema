/**
 * MovieCard Component Tests
 * 
 * Tests for the movie card presentation component.
 */

import React from 'react';
import { describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MovieCard } from '../movie-card';
import type { Movie } from '@/lib/types';

// Mock next-intl
jest.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: (namespace: string) => {
    const translations: Record<string, Record<string, string>> = {
      movie: {
        cast: 'Cast',
        'availabilityStatus.external': 'External',
        'availabilityStatus.unavailable': 'Unavailable',
        'availabilityStatus.comingSoon': 'Coming Soon',
      },
      crew: {
        director: 'Director',
        writer: 'Writer',
      },
      genres: {
        drama: 'Drama',
        action: 'Action',
        comedy: 'Comedy',
        unknown: 'Unknown',
      },
    };
    return (key: string) => translations[namespace]?.[key] || key;
  },
}));

// Mock i18n routing
jest.mock('@/i18n/routing', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href} data-testid="movie-link">{children}</a>
  ),
}));

// Mock image utilities
jest.mock('@/lib/images', () => ({
  getPosterUrl: (path: string | undefined) => path ? `https://tmdb.org${path}` : null,
}));

// Mock genres utility
jest.mock('@/lib/genres', () => ({
  getGenreKey: (name: string) => name.toLowerCase(),
}));

// Mock movie URL utility
jest.mock('@/lib/movie-url', () => ({
  getMovieUrl: (movie: any) => `/movies/${movie.id}`,
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} data-testid="movie-poster" />
  ),
}));

// Create a base movie for testing
const createTestMovie = (overrides: Partial<Movie> = {}): Movie => ({
  id: 'test-movie-123',
  title: { en: 'Test Movie', lo: 'ຮູບເງົາທົດສອບ' },
  overview: { en: 'A test movie overview', lo: 'ພາບລວມຂອງຮູບເງົາທົດສອບ' },
  poster_path: '/poster.jpg',
  backdrop_path: '/backdrop.jpg',
  release_date: '2024-06-15',
  runtime: 120,
  vote_average: 8.5,
  vote_count: 1000,
  original_title: 'Test Movie',
  original_language: 'en',
  genres: [
    { id: 18, name: { en: 'Drama', lo: 'ລະຄອນ' } },
    { id: 28, name: { en: 'Action', lo: 'ແອັກຊັ່ນ' } },
  ],
  cast: [
    { person: { id: 1, name: { en: 'Actor One', lo: 'ນັກສະແດງ 1' }, profile_path: undefined }, character: { en: 'Hero' }, order: 0 },
    { person: { id: 2, name: { en: 'Actor Two', lo: 'ນັກສະແດງ 2' }, profile_path: undefined }, character: { en: 'Villain' }, order: 1 },
  ],
  crew: [
    { person: { id: 10, name: { en: 'John Director', lo: 'ຜູ້ກຳກັບ' }, profile_path: undefined }, job: { en: 'Director' }, department: 'Directing' },
    { person: { id: 11, name: { en: 'Jane Writer', lo: 'ນັກຂຽນ' }, profile_path: undefined }, job: { en: 'Writer' }, department: 'Writing' },
  ],
  video_sources: [{ id: '1', url: '/video.m3u8', quality: '1080p', format: 'hls' }],
  availability_status: 'auto',
  ...overrides,
});

describe('MovieCard', () => {
  describe('Basic Rendering', () => {
    it('should render movie title', () => {
      const movie = createTestMovie();
      render(<MovieCard movie={movie} />);
      
      expect(screen.getByText('Test Movie')).toBeInTheDocument();
    });

    it('should render movie poster when available', () => {
      const movie = createTestMovie();
      render(<MovieCard movie={movie} />);
      
      const poster = screen.getByTestId('movie-poster');
      expect(poster).toBeInTheDocument();
      expect(poster).toHaveAttribute('src', 'https://tmdb.org/poster.jpg');
    });

    it('should render fallback when no poster', () => {
      const movie = createTestMovie({ poster_path: undefined });
      render(<MovieCard movie={movie} />);
      
      // Should show first letter of title as fallback
      expect(screen.getByText('T')).toBeInTheDocument();
    });

    it('should render release year', () => {
      const movie = createTestMovie();
      render(<MovieCard movie={movie} />);
      
      expect(screen.getByText('2024')).toBeInTheDocument();
    });

    it('should render runtime', () => {
      const movie = createTestMovie();
      render(<MovieCard movie={movie} />);
      
      expect(screen.getByText('120 min')).toBeInTheDocument();
    });
  });

  describe('Genres', () => {
    it('should render genre badges', () => {
      const movie = createTestMovie();
      render(<MovieCard movie={movie} />);
      
      // Genres should be translated (mock returns proper case from translation)
      expect(screen.getByText('Drama')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
    });

    it('should limit to 3 genres', () => {
      const movie = createTestMovie({
        genres: [
          { id: 1, name: { en: 'Drama' } },
          { id: 2, name: { en: 'Action' } },
          { id: 3, name: { en: 'Comedy' } },
          { id: 4, name: { en: 'Horror' } },
        ],
      });
      render(<MovieCard movie={movie} />);
      
      // Should only show 3
      expect(screen.getByText('Drama')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
      expect(screen.getByText('Comedy')).toBeInTheDocument();
      expect(screen.queryByText('Horror')).not.toBeInTheDocument();
    });

    it('should handle no genres', () => {
      const movie = createTestMovie({ genres: [] });
      render(<MovieCard movie={movie} />);
      
      // Should not crash
      expect(screen.getByText('Test Movie')).toBeInTheDocument();
    });
  });

  describe('Tagline', () => {
    it('should render tagline when present', () => {
      const movie = createTestMovie({ tagline: { en: 'An epic adventure' } });
      render(<MovieCard movie={movie} />);
      
      expect(screen.getByText('"An epic adventure"')).toBeInTheDocument();
    });

    it('should not render tagline when absent', () => {
      const movie = createTestMovie();
      render(<MovieCard movie={movie} />);
      
      // No quotes should appear for missing tagline
      expect(screen.queryByText(/^"/)).not.toBeInTheDocument();
    });
  });

  describe('Cast and Crew', () => {
    it('should render director', () => {
      const movie = createTestMovie();
      render(<MovieCard movie={movie} />);
      
      expect(screen.getByText('Director:')).toBeInTheDocument();
      expect(screen.getByText('John Director')).toBeInTheDocument();
    });

    it('should render writer', () => {
      const movie = createTestMovie();
      render(<MovieCard movie={movie} />);
      
      expect(screen.getByText('Writer:')).toBeInTheDocument();
      expect(screen.getByText('Jane Writer')).toBeInTheDocument();
    });

    it('should render top cast members', () => {
      const movie = createTestMovie();
      render(<MovieCard movie={movie} />);
      
      expect(screen.getByText('Cast:')).toBeInTheDocument();
      expect(screen.getByText('Actor One, Actor Two')).toBeInTheDocument();
    });

    it('should handle missing crew', () => {
      const movie = createTestMovie({ crew: [] });
      render(<MovieCard movie={movie} />);
      
      // Should not show director/writer
      expect(screen.queryByText('Director:')).not.toBeInTheDocument();
      expect(screen.queryByText('Writer:')).not.toBeInTheDocument();
    });

    it('should handle missing cast', () => {
      const movie = createTestMovie({ cast: [] });
      render(<MovieCard movie={movie} />);
      
      // Should not show cast section
      expect(screen.queryByText('Cast:')).not.toBeInTheDocument();
    });
  });

  describe('Availability Status', () => {
    it('should show external badge for external movies', () => {
      const movie = createTestMovie({
        availability_status: 'external',
        video_sources: [],
        external_platforms: [{ platform: 'netflix', url: 'https://netflix.com' }],
      });
      render(<MovieCard movie={movie} />);
      
      expect(screen.getByText('External')).toBeInTheDocument();
    });

    it('should show unavailable badge for unavailable movies', () => {
      const movie = createTestMovie({
        availability_status: 'unavailable',
        video_sources: [],
      });
      render(<MovieCard movie={movie} />);
      
      expect(screen.getByText('Unavailable')).toBeInTheDocument();
    });

    it('should show coming soon badge', () => {
      const movie = createTestMovie({
        availability_status: 'coming_soon',
      });
      render(<MovieCard movie={movie} />);
      
      expect(screen.getByText('Coming Soon')).toBeInTheDocument();
    });

    it('should not show badge for available movies', () => {
      const movie = createTestMovie({
        availability_status: 'available',
        video_sources: [{ id: '1', url: '/video.m3u8', quality: '1080p', format: 'hls' }],
      });
      render(<MovieCard movie={movie} />);
      
      expect(screen.queryByText('External')).not.toBeInTheDocument();
      expect(screen.queryByText('Unavailable')).not.toBeInTheDocument();
      expect(screen.queryByText('Coming Soon')).not.toBeInTheDocument();
    });

    it('should infer available status from video sources', () => {
      const movie = createTestMovie({
        availability_status: undefined,
        video_sources: [{ id: '1', url: '/video.m3u8', quality: '1080p', format: 'hls' }],
      });
      render(<MovieCard movie={movie} />);
      
      // No badge should be shown
      expect(screen.queryByText('Unavailable')).not.toBeInTheDocument();
    });
  });

  describe('Link', () => {
    it('should link to movie detail page', () => {
      const movie = createTestMovie();
      render(<MovieCard movie={movie} />);
      
      const link = screen.getByTestId('movie-link');
      expect(link).toBeInTheDocument();
      // Link href should include movie ID or slug
      expect(link).toHaveAttribute('href');
    });
  });

  describe('Missing Data Handling', () => {
    it('should handle missing release date', () => {
      const movie = createTestMovie({ release_date: undefined });
      render(<MovieCard movie={movie} />);
      
      // Should not crash and should render title
      expect(screen.getByText('Test Movie')).toBeInTheDocument();
      expect(screen.queryByText('2024')).not.toBeInTheDocument();
    });

    it('should handle missing runtime', () => {
      const movie = createTestMovie({ runtime: undefined });
      render(<MovieCard movie={movie} />);
      
      // Should not crash
      expect(screen.getByText('Test Movie')).toBeInTheDocument();
      expect(screen.queryByText('min')).not.toBeInTheDocument();
    });
  });
});
