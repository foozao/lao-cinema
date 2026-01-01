/**
 * PersonAccolades Component Tests
 * 
 * Tests for the person accolades display component.
 */

import React from 'react';
import { describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PersonAccolades } from '../person-accolades';

// Mock next-intl
jest.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'accolades.awardsRecognition': 'Awards & Recognition',
      'accolades.associatedFilmAccolades': 'Associated Film Accolades',
      'accolades.winner': 'Winner',
      'accolades.nominee': 'Nominee',
      'accolades.selection': 'Selection',
      'accolades.forFilm': 'For film',
    };
    return translations[key] || key;
  },
}));

// Mock i18n routing
jest.mock('@/i18n/routing', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href} data-testid="link">{children}</a>
  ),
}));

// Mock i18n helper
jest.mock('@/lib/i18n', () => ({
  getLocalizedText: (text: Record<string, string> | undefined, locale: string) => {
    if (!text) return '';
    return text[locale] || text.en || Object.values(text)[0] || '';
  },
}));

// Mock API client
const mockGetAccolades = jest.fn();
jest.mock('@/lib/api/client', () => ({
  peopleAPI: {
    getAccolades: (...args: any[]) => mockGetAccolades(...args),
  },
}));

// =============================================================================
// TEST DATA FACTORIES
// =============================================================================

const createPersonalAward = (overrides: Partial<any> = {}) => ({
  id: `award-${Math.random().toString(36).substr(2, 9)}`,
  type: 'nomination' as const,
  is_winner: false,
  show: { id: 'show-1', slug: 'cannes', name: { en: 'Cannes Film Festival', lo: 'ງານບຸນຮູບເງົາ Cannes' } },
  edition: { id: 'ed-1', year: 2024, edition_number: 77 },
  category: { id: 'cat-1', name: { en: 'Best Director', lo: 'ຜູ້ກຳກັບຍອດຢ້ຽມ' }, section: null },
  section: null,
  movie: { id: 'movie-1', title: { en: 'Test Film', lo: 'ຮູບເງົາທົດສອບ' }, poster_path: '/poster.jpg' },
  recognition_type: null,
  notes: null,
  award_body: null,
  ...overrides,
});

const createFilmAccolade = (overrides: Partial<any> = {}) => ({
  id: `accolade-${Math.random().toString(36).substr(2, 9)}`,
  type: 'nomination' as const,
  is_winner: false,
  show: { id: 'show-1', slug: 'oscars', name: { en: 'Academy Awards', lo: 'ລາງວັນອະຄາເດມີ' } },
  edition: { id: 'ed-2', year: 2024, edition_number: 96 },
  category: { id: 'cat-2', name: { en: 'Best Picture', lo: 'ຮູບເງົາຍອດຢ້ຽມ' }, section: null },
  section: null,
  movie: { id: 'movie-1', title: { en: 'Test Film', lo: 'ຮູບເງົາທົດສອບ' }, poster_path: '/poster.jpg' },
  recognition_type: null,
  notes: null,
  award_body: null,
  ...overrides,
});

const createSelection = (overrides: Partial<any> = {}) => ({
  id: `selection-${Math.random().toString(36).substr(2, 9)}`,
  type: 'selection' as const,
  is_winner: false,
  show: { id: 'show-2', slug: 'berlin', name: { en: 'Berlin Film Festival', lo: 'ງານບຸນຮູບເງົາ Berlin' } },
  edition: { id: 'ed-3', year: 2024, edition_number: 74 },
  category: null,
  section: { id: 'sec-1', name: { en: 'Competition', lo: 'ການແຂ່ງຂັນ' } },
  movie: { id: 'movie-2', title: { en: 'Another Film', lo: 'ຮູບເງົາອື່ນ' }, poster_path: '/poster2.jpg' },
  recognition_type: null,
  notes: null,
  award_body: null,
  ...overrides,
});

// =============================================================================
// TESTS
// =============================================================================

describe('PersonAccolades', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should return null while loading', () => {
      mockGetAccolades.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      const { container } = render(<PersonAccolades personId={123} />);
      
      // Should render nothing during loading
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Empty State', () => {
    it('should return null when no accolades exist', async () => {
      mockGetAccolades.mockResolvedValue({
        personal_awards: [],
        film_accolades: [],
      });
      
      const { container } = render(<PersonAccolades personId={123} />);
      
      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    it('should return null for personal section when no personal awards', async () => {
      mockGetAccolades.mockResolvedValue({
        personal_awards: [],
        film_accolades: [createFilmAccolade()],
      });
      
      const { container } = render(<PersonAccolades personId={123} section="personal" />);
      
      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    it('should return null for film section when no film accolades', async () => {
      mockGetAccolades.mockResolvedValue({
        personal_awards: [createPersonalAward()],
        film_accolades: [],
      });
      
      const { container } = render(<PersonAccolades personId={123} section="film" />);
      
      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });
  });

  describe('Personal Awards Section', () => {
    it('should render personal awards section header', async () => {
      mockGetAccolades.mockResolvedValue({
        personal_awards: [createPersonalAward()],
        film_accolades: [],
      });
      
      render(<PersonAccolades personId={123} />);
      
      await waitFor(() => {
        expect(screen.getByText('Awards & Recognition')).toBeInTheDocument();
      });
    });

    it('should render winner badge for winning award', async () => {
      mockGetAccolades.mockResolvedValue({
        personal_awards: [createPersonalAward({ is_winner: true })],
        film_accolades: [],
      });
      
      render(<PersonAccolades personId={123} />);
      
      await waitFor(() => {
        expect(screen.getByText('Winner')).toBeInTheDocument();
      });
    });

    it('should render nominee badge for non-winning award', async () => {
      mockGetAccolades.mockResolvedValue({
        personal_awards: [createPersonalAward({ is_winner: false })],
        film_accolades: [],
      });
      
      render(<PersonAccolades personId={123} />);
      
      await waitFor(() => {
        expect(screen.getByText('Nominee')).toBeInTheDocument();
      });
    });

    it('should render category name', async () => {
      mockGetAccolades.mockResolvedValue({
        personal_awards: [createPersonalAward({
          category: { id: 'cat-1', name: { en: 'Best Director' }, section: null },
        })],
        film_accolades: [],
      });
      
      render(<PersonAccolades personId={123} />);
      
      await waitFor(() => {
        expect(screen.getByText('Best Director')).toBeInTheDocument();
      });
    });

    it('should render show name and year', async () => {
      mockGetAccolades.mockResolvedValue({
        personal_awards: [createPersonalAward({
          show: { id: 's1', slug: 'cannes', name: { en: 'Cannes Film Festival' } },
          edition: { id: 'e1', year: 2024, edition_number: 77 },
        })],
        film_accolades: [],
      });
      
      render(<PersonAccolades personId={123} />);
      
      await waitFor(() => {
        expect(screen.getByText('Cannes Film Festival')).toBeInTheDocument();
        expect(screen.getByText('(2024)')).toBeInTheDocument();
      });
    });

    it('should render associated film name when present', async () => {
      mockGetAccolades.mockResolvedValue({
        personal_awards: [createPersonalAward({
          movie: { id: 'm1', title: { en: 'The Great Film' }, poster_path: null },
        })],
        film_accolades: [],
      });
      
      render(<PersonAccolades personId={123} />);
      
      await waitFor(() => {
        expect(screen.getByText(/For film.*The Great Film/)).toBeInTheDocument();
      });
    });

    it('should render section name when present', async () => {
      mockGetAccolades.mockResolvedValue({
        personal_awards: [createPersonalAward({
          section: { id: 's1', name: { en: 'Competition' } },
        })],
        film_accolades: [],
      });
      
      render(<PersonAccolades personId={123} />);
      
      await waitFor(() => {
        expect(screen.getByText('Competition')).toBeInTheDocument();
      });
    });
  });

  describe('Film Accolades Section', () => {
    it('should render film accolades section header', async () => {
      mockGetAccolades.mockResolvedValue({
        personal_awards: [],
        film_accolades: [createFilmAccolade()],
      });
      
      render(<PersonAccolades personId={123} />);
      
      await waitFor(() => {
        expect(screen.getByText('Associated Film Accolades')).toBeInTheDocument();
      });
    });

    it('should group accolades by movie', async () => {
      mockGetAccolades.mockResolvedValue({
        personal_awards: [],
        film_accolades: [
          createFilmAccolade({ movie: { id: 'm1', title: { en: 'Film A' }, poster_path: null } }),
          createFilmAccolade({ movie: { id: 'm2', title: { en: 'Film B' }, poster_path: null } }),
        ],
      });
      
      render(<PersonAccolades personId={123} />);
      
      await waitFor(() => {
        expect(screen.getByText('Film A')).toBeInTheDocument();
        expect(screen.getByText('Film B')).toBeInTheDocument();
      });
    });

    it('should group accolades by event within movie', async () => {
      mockGetAccolades.mockResolvedValue({
        personal_awards: [],
        film_accolades: [
          createFilmAccolade({
            movie: { id: 'm1', title: { en: 'Film A' }, poster_path: null },
            show: { id: 's1', slug: 'oscars', name: { en: 'Oscars' } },
            edition: { id: 'e1', year: 2024, edition_number: 96 },
          }),
          createFilmAccolade({
            movie: { id: 'm1', title: { en: 'Film A' }, poster_path: null },
            show: { id: 's2', slug: 'cannes', name: { en: 'Cannes' } },
            edition: { id: 'e2', year: 2024, edition_number: 77 },
          }),
        ],
      });
      
      render(<PersonAccolades personId={123} />);
      
      await waitFor(() => {
        expect(screen.getByText('Oscars')).toBeInTheDocument();
        expect(screen.getByText('Cannes')).toBeInTheDocument();
      });
    });

    it('should render winner status for film accolades', async () => {
      mockGetAccolades.mockResolvedValue({
        personal_awards: [],
        film_accolades: [createFilmAccolade({ is_winner: true })],
      });
      
      render(<PersonAccolades personId={123} />);
      
      await waitFor(() => {
        expect(screen.getByText('Winner')).toBeInTheDocument();
      });
    });

    it('should render category for film accolades', async () => {
      mockGetAccolades.mockResolvedValue({
        personal_awards: [],
        film_accolades: [createFilmAccolade({
          category: { id: 'c1', name: { en: 'Best Cinematography' }, section: null },
        })],
      });
      
      render(<PersonAccolades personId={123} />);
      
      await waitFor(() => {
        expect(screen.getByText('Best Cinematography')).toBeInTheDocument();
      });
    });

    it('should render selection type accolades', async () => {
      mockGetAccolades.mockResolvedValue({
        personal_awards: [],
        film_accolades: [createSelection()],
      });
      
      render(<PersonAccolades personId={123} />);
      
      await waitFor(() => {
        expect(screen.getByText('Selection')).toBeInTheDocument();
        expect(screen.getByText('Competition')).toBeInTheDocument();
      });
    });

    it('should handle accolades without movie gracefully', async () => {
      mockGetAccolades.mockResolvedValue({
        personal_awards: [],
        film_accolades: [{ ...createFilmAccolade(), movie: undefined }],
      });
      
      const { container } = render(<PersonAccolades personId={123} />);
      
      // Should not crash, and accolades without movie should be filtered out
      await waitFor(() => {
        // Only shows film accolades section if there are valid film accolades
        expect(container.querySelector('section')).toBeNull();
      });
    });
  });

  describe('Section Prop', () => {
    it('should only show personal awards when section="personal"', async () => {
      mockGetAccolades.mockResolvedValue({
        personal_awards: [createPersonalAward()],
        film_accolades: [createFilmAccolade()],
      });
      
      render(<PersonAccolades personId={123} section="personal" />);
      
      await waitFor(() => {
        expect(screen.getByText('Awards & Recognition')).toBeInTheDocument();
        expect(screen.queryByText('Associated Film Accolades')).not.toBeInTheDocument();
      });
    });

    it('should only show film accolades when section="film"', async () => {
      mockGetAccolades.mockResolvedValue({
        personal_awards: [createPersonalAward()],
        film_accolades: [createFilmAccolade()],
      });
      
      render(<PersonAccolades personId={123} section="film" />);
      
      await waitFor(() => {
        expect(screen.queryByText('Awards & Recognition')).not.toBeInTheDocument();
        expect(screen.getByText('Associated Film Accolades')).toBeInTheDocument();
      });
    });

    it('should show both sections when section="both" (default)', async () => {
      mockGetAccolades.mockResolvedValue({
        personal_awards: [createPersonalAward()],
        film_accolades: [createFilmAccolade()],
      });
      
      render(<PersonAccolades personId={123} section="both" />);
      
      await waitFor(() => {
        expect(screen.getByText('Awards & Recognition')).toBeInTheDocument();
        expect(screen.getByText('Associated Film Accolades')).toBeInTheDocument();
      });
    });

    it('should default to both sections when section prop not provided', async () => {
      mockGetAccolades.mockResolvedValue({
        personal_awards: [createPersonalAward()],
        film_accolades: [createFilmAccolade()],
      });
      
      render(<PersonAccolades personId={123} />);
      
      await waitFor(() => {
        expect(screen.getByText('Awards & Recognition')).toBeInTheDocument();
        expect(screen.getByText('Associated Film Accolades')).toBeInTheDocument();
      });
    });
  });

  describe('Award Body Display', () => {
    it('should render award body name with category', async () => {
      mockGetAccolades.mockResolvedValue({
        personal_awards: [],
        film_accolades: [createFilmAccolade({
          category: { id: 'c1', name: { en: 'Best Actor' }, section: null },
          award_body: { id: 'ab1', abbreviation: 'SAG', name: { en: 'Screen Actors Guild' } },
        })],
      });
      
      render(<PersonAccolades personId={123} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Screen Actors Guild Award.*Best Actor/)).toBeInTheDocument();
      });
    });
  });

  describe('Event Sorting', () => {
    it('should sort events by year (most recent first)', async () => {
      mockGetAccolades.mockResolvedValue({
        personal_awards: [],
        film_accolades: [
          createFilmAccolade({
            movie: { id: 'm1', title: { en: 'Film A' }, poster_path: null },
            show: { id: 's1', slug: 'old', name: { en: 'Old Event' } },
            edition: { id: 'e1', year: 2020, edition_number: 1 },
          }),
          createFilmAccolade({
            movie: { id: 'm1', title: { en: 'Film A' }, poster_path: null },
            show: { id: 's2', slug: 'new', name: { en: 'New Event' } },
            edition: { id: 'e2', year: 2024, edition_number: 1 },
          }),
        ],
      });
      
      render(<PersonAccolades personId={123} />);
      
      await waitFor(() => {
        const events = screen.getAllByText(/Event/);
        // New Event should appear before Old Event
        expect(events[0]).toHaveTextContent('New Event');
        expect(events[1]).toHaveTextContent('Old Event');
      });
    });
  });

  describe('API Integration', () => {
    it('should call API with correct person ID', async () => {
      mockGetAccolades.mockResolvedValue({
        personal_awards: [],
        film_accolades: [],
      });
      
      render(<PersonAccolades personId={456} />);
      
      await waitFor(() => {
        expect(mockGetAccolades).toHaveBeenCalledWith(456);
      });
    });

    it('should handle API errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockGetAccolades.mockRejectedValue(new Error('API Error'));
      
      const { container } = render(<PersonAccolades personId={123} />);
      
      await waitFor(() => {
        // Should not crash, render null on error
        expect(container.firstChild).toBeNull();
      });
      
      expect(consoleError).toHaveBeenCalledWith('Failed to load person accolades:', expect.any(Error));
      consoleError.mockRestore();
    });

    it('should refetch when personId changes', async () => {
      mockGetAccolades.mockResolvedValue({
        personal_awards: [],
        film_accolades: [],
      });
      
      const { rerender } = render(<PersonAccolades personId={123} />);
      
      await waitFor(() => {
        expect(mockGetAccolades).toHaveBeenCalledWith(123);
      });
      
      rerender(<PersonAccolades personId={456} />);
      
      await waitFor(() => {
        expect(mockGetAccolades).toHaveBeenCalledWith(456);
      });
    });
  });

  describe('Multiple Awards Rendering', () => {
    it('should render multiple personal awards', async () => {
      mockGetAccolades.mockResolvedValue({
        personal_awards: [
          createPersonalAward({ id: 'a1', category: { id: 'c1', name: { en: 'Best Director' }, section: null } }),
          createPersonalAward({ id: 'a2', category: { id: 'c2', name: { en: 'Best Screenplay' }, section: null } }),
          createPersonalAward({ id: 'a3', category: { id: 'c3', name: { en: 'Best Film' }, section: null } }),
        ],
        film_accolades: [],
      });
      
      render(<PersonAccolades personId={123} />);
      
      await waitFor(() => {
        expect(screen.getByText('Best Director')).toBeInTheDocument();
        expect(screen.getByText('Best Screenplay')).toBeInTheDocument();
        expect(screen.getByText('Best Film')).toBeInTheDocument();
      });
    });

    it('should handle mix of winners and nominees', async () => {
      mockGetAccolades.mockResolvedValue({
        personal_awards: [
          createPersonalAward({ id: 'a1', is_winner: true }),
          createPersonalAward({ id: 'a2', is_winner: false }),
        ],
        film_accolades: [],
      });
      
      render(<PersonAccolades personId={123} />);
      
      await waitFor(() => {
        expect(screen.getByText('Winner')).toBeInTheDocument();
        expect(screen.getByText('Nominee')).toBeInTheDocument();
      });
    });
  });
});
