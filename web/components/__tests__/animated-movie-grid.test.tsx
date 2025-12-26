/**
 * AnimatedMovieGrid Component Tests
 * 
 * Tests for the responsive movie grid component.
 */

import React from 'react';
import { describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AnimatedMovieGrid } from '../animated-movie-grid';
import type { Movie } from '@/lib/types';

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockImplementation((callback) => ({
  observe: jest.fn((element) => {
    // Immediately trigger intersection for testing
    callback([{ isIntersecting: true, target: element }]);
  }),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
window.IntersectionObserver = mockIntersectionObserver;

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
      genres: {},
    };
    return (key: string) => translations[namespace]?.[key] || key;
  },
}));

// Mock i18n routing
jest.mock('@/i18n/routing', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
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
    <img src={src} alt={alt} />
  ),
}));

// Create test movies
const createTestMovie = (id: string, title: string): Movie => ({
  id,
  title: { en: title, lo: title },
  overview: { en: 'Overview', lo: 'Overview' },
  poster_path: '/poster.jpg',
  backdrop_path: '/backdrop.jpg',
  release_date: '2024-01-01',
  runtime: 120,
  vote_average: 8.0,
  vote_count: 100,
  original_title: title,
  original_language: 'en',
  genres: [],
  cast: [],
  crew: [],
  video_sources: [],
  availability_status: 'auto',
  adult: false,
  popularity: 100,
  tagline: { en: '', lo: '' },
  status: 'Released',
  budget: 0,
  revenue: 0,
});

describe('AnimatedMovieGrid', () => {
  beforeEach(() => {
    mockIntersectionObserver.mockClear();
  });

  describe('Grid Layout', () => {
    it('should render with correct responsive grid classes', () => {
      const movies = [createTestMovie('1', 'Movie 1')];
      const { container } = render(<AnimatedMovieGrid movies={movies} />);
      
      const grid = container.firstChild as HTMLElement;
      expect(grid).toHaveClass('grid');
      // Should have 2 columns on mobile
      expect(grid).toHaveClass('grid-cols-2');
      // Should switch to 1 column at sm breakpoint for detailed cards
      expect(grid).toHaveClass('sm:grid-cols-1');
      // Should have 2 columns at lg breakpoint
      expect(grid).toHaveClass('lg:grid-cols-2');
      // Should have 3 columns at xl breakpoint
      expect(grid).toHaveClass('xl:grid-cols-3');
    });

    it('should render with correct gap classes', () => {
      const movies = [createTestMovie('1', 'Movie 1')];
      const { container } = render(<AnimatedMovieGrid movies={movies} />);
      
      const grid = container.firstChild as HTMLElement;
      // Should have small gap on mobile
      expect(grid).toHaveClass('gap-2');
      // Should have larger gap at sm breakpoint
      expect(grid).toHaveClass('sm:gap-3');
      // Should have larger gap at lg breakpoint
      expect(grid).toHaveClass('lg:gap-4');
    });
  });

  describe('Movie Rendering', () => {
    it('should render all movies', () => {
      const movies = [
        createTestMovie('1', 'Movie One'),
        createTestMovie('2', 'Movie Two'),
        createTestMovie('3', 'Movie Three'),
      ];
      render(<AnimatedMovieGrid movies={movies} />);
      
      // Each movie title appears twice (mobile overlay + desktop view)
      expect(screen.getAllByText('Movie One')).toHaveLength(2);
      expect(screen.getAllByText('Movie Two')).toHaveLength(2);
      expect(screen.getAllByText('Movie Three')).toHaveLength(2);
    });

    it('should render empty grid when no movies', () => {
      const { container } = render(<AnimatedMovieGrid movies={[]} />);
      
      const grid = container.firstChild as HTMLElement;
      expect(grid.children.length).toBe(0);
    });

    it('should assign data-index to each movie card wrapper', () => {
      const movies = [
        createTestMovie('1', 'Movie One'),
        createTestMovie('2', 'Movie Two'),
      ];
      const { container } = render(<AnimatedMovieGrid movies={movies} />);
      
      const grid = container.firstChild as HTMLElement;
      expect(grid.children[0]).toHaveAttribute('data-index', '0');
      expect(grid.children[1]).toHaveAttribute('data-index', '1');
    });
  });

  describe('Animation', () => {
    it('should apply animation classes to card wrappers', () => {
      const movies = [createTestMovie('1', 'Movie One')];
      const { container } = render(<AnimatedMovieGrid movies={movies} />);
      
      const grid = container.firstChild as HTMLElement;
      const cardWrapper = grid.children[0];
      
      // Should have transform and transition classes
      expect(cardWrapper).toHaveClass('transform');
      expect(cardWrapper).toHaveClass('transition-all');
      expect(cardWrapper).toHaveClass('duration-500');
    });
  });
});
