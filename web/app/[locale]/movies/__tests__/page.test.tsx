import { Suspense } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import MoviesPage from '../page';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: jest.fn(),
  useLocale: jest.fn(),
}));

// Mock i18n routing
jest.mock('@/i18n/routing', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock components
jest.mock('@/components/header', () => ({
  Header: ({ variant }: { variant: string }) => <div data-testid="header">{variant}</div>,
}));

jest.mock('@/components/footer', () => ({
  Footer: () => <div data-testid="footer">Footer</div>,
}));

jest.mock('@/components/movie-card', () => ({
  MovieCard: ({ movie }: { movie: any }) => (
    <div data-testid={`movie-card-${movie.id}`}>{movie.title.en}</div>
  ),
}));

jest.mock('@/components/api-error', () => ({
  APIError: ({ onRetry, type }: { onRetry: () => void; type: string }) => (
    <div data-testid="api-error" data-type={type}>
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}));

// Mock fetch
global.fetch = jest.fn();

describe('MoviesPage', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  };

  const mockSearchParams = {
    get: jest.fn(),
  };

  const mockT = jest.fn((key: string) => key);

  const mockMovies = [
    {
      id: '1',
      title: { en: 'The Signal', lo: 'ສັນຍານ' },
      runtime: 90,
      video_sources: [{ id: 'v1', url: '/video1.m3u8', quality: '1080p', format: 'hls' }],
      cast: [
        {
          person: {
            id: 1,
            name: { en: 'John Doe', lo: 'ຈອນ ໂດ' },
          },
          character: { en: 'Hero' },
          order: 0,
        },
      ],
      crew: [
        {
          person: {
            id: 2,
            name: { en: 'Jane Smith', lo: 'ເຈນ ສະມິດ' },
          },
          job: { en: 'Director' },
          department: 'Directing',
        },
      ],
    },
    {
      id: '2',
      title: { en: 'Short Film', lo: 'ຮູບເງົາສັ້ນ' },
      runtime: 30,
      video_sources: [{ id: 'v2', url: '/video2.m3u8', quality: '1080p', format: 'hls' }],
      cast: [],
      crew: [],
    },
    {
      id: '3',
      title: { en: 'Feature Film', lo: 'ຮູບເງົາຍາວ' },
      runtime: 120,
      video_sources: [{ id: 'v3', url: '/video3.m3u8', quality: '1080p', format: 'hls' }],
      cast: [],
      crew: [],
    },
  ];

  // Helper function to render component with Suspense
  const renderMoviesPage = () => {
    return render(
      <Suspense fallback={<div>Loading...</div>}>
        <MoviesPage />
      </Suspense>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    (useTranslations as jest.Mock).mockReturnValue(mockT);
    (useLocale as jest.Mock).mockReturnValue('en');
    mockSearchParams.get.mockReturnValue(null);
    
    // Mock fetch to handle both movies and people API calls
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      // Handle movies API
      if (url.includes('/api/movies') || url.includes('/movies')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ movies: mockMovies }),
        });
      }
      
      // Handle people search API
      if (url.includes('/people?search=')) {
        const searchQuery = new URL(url, 'http://localhost').searchParams.get('search') || '';
        const matchingPeople = mockMovies
          .flatMap(m => [...(m.cast || []), ...(m.crew || [])])
          .map(member => member.person)
          .filter(person => person?.name?.en?.toLowerCase().includes(searchQuery.toLowerCase()));
        
        return Promise.resolve({
          ok: true,
          json: async () => ({ people: matchingPeople }),
        });
      }
      
      // Default fallback
      return Promise.resolve({
        ok: true,
        json: async () => ({ movies: mockMovies }),
      });
    });
  });

  describe('Initial Load', () => {
    it('renders header and footer', async () => {
      renderMoviesPage();
      
      await waitFor(() => {
        expect(screen.getByTestId('header')).toBeInTheDocument();
        expect(screen.getByTestId('footer')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('fetches and displays movies', async () => {
      renderMoviesPage();
      
      await waitFor(() => {
        expect(screen.getByTestId('movie-card-1')).toBeInTheDocument();
        expect(screen.getByTestId('movie-card-2')).toBeInTheDocument();
        expect(screen.getByTestId('movie-card-3')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Search Functionality', () => {
    it('filters movies by title', async () => {
      renderMoviesPage();
      
      await waitFor(() => {
        expect(screen.getByTestId('movie-card-1')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('admin.searchMovies');
      fireEvent.change(searchInput, { target: { value: 'Signal' } });

      await waitFor(() => {
        expect(screen.getByTestId('movie-card-1')).toBeInTheDocument();
        expect(screen.queryByTestId('movie-card-2')).not.toBeInTheDocument();
      });
    });



  });

  describe('Filter Functionality', () => {
    it('filters to show all movies by default', async () => {
      renderMoviesPage();
      
      await waitFor(() => {
        expect(screen.getByTestId('movie-card-1')).toBeInTheDocument();
        expect(screen.getByTestId('movie-card-2')).toBeInTheDocument();
        expect(screen.getByTestId('movie-card-3')).toBeInTheDocument();
      });
    });

    it('filters to show only feature films', async () => {
      renderMoviesPage();
      
      await waitFor(() => {
        expect(screen.getByTestId('movie-card-1')).toBeInTheDocument();
      });

      const featureButton = screen.getByText('movies.feature');
      fireEvent.click(featureButton);

      await waitFor(() => {
        expect(screen.getByTestId('movie-card-1')).toBeInTheDocument(); // 90 min
        expect(screen.queryByTestId('movie-card-2')).not.toBeInTheDocument(); // 30 min
        expect(screen.getByTestId('movie-card-3')).toBeInTheDocument(); // 120 min
      });
    });

    it('filters to show only short films', async () => {
      renderMoviesPage();
      
      await waitFor(() => {
        expect(screen.getByTestId('movie-card-1')).toBeInTheDocument();
      });

      const shortButton = screen.getByText('movies.short');
      fireEvent.click(shortButton);

      await waitFor(() => {
        expect(screen.queryByTestId('movie-card-1')).not.toBeInTheDocument(); // 90 min
        expect(screen.getByTestId('movie-card-2')).toBeInTheDocument(); // 30 min
        expect(screen.queryByTestId('movie-card-3')).not.toBeInTheDocument(); // 120 min
      });
    });

  });

  describe('URL State Management', () => {
    it('initializes search from URL params', async () => {
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'q') return 'Signal';
        if (key === 'filter') return 'feature';
        return null;
      });

      renderMoviesPage();
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('admin.searchMovies') as HTMLInputElement;
        expect(searchInput.value).toBe('Signal');
      });
    });

    it('updates URL when search query changes', async () => {
      renderMoviesPage();
      
      await waitFor(() => {
        expect(screen.getByTestId('movie-card-1')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('admin.searchMovies');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith(
          expect.stringContaining('?q=test'),
          expect.objectContaining({ scroll: false })
        );
      });
    });

    it('updates URL when filter changes', async () => {
      renderMoviesPage();
      
      await waitFor(() => {
        expect(screen.getByTestId('movie-card-1')).toBeInTheDocument();
      });

      const featureButton = screen.getByText('movies.feature');
      fireEvent.click(featureButton);

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith(
          expect.stringContaining('filter=feature'),
          expect.objectContaining({ scroll: false })
        );
      });
    });

    it('clears URL params when returning to default state', async () => {
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'q') return 'test';
        return null;
      });

      renderMoviesPage();
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('admin.searchMovies') as HTMLInputElement;
        expect(searchInput.value).toBe('test');
      });

      const searchInput = screen.getByPlaceholderText('admin.searchMovies');
      fireEvent.change(searchInput, { target: { value: '' } });

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith(
          expect.not.stringContaining('?'),
          expect.objectContaining({ scroll: false })
        );
      });
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no movies exist', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ movies: [] }),
      });

      renderMoviesPage();
      
      await waitFor(() => {
        expect(screen.getByText('home.noFilms')).toBeInTheDocument();
      });
    });

    it('shows no results message when search returns nothing', async () => {
      renderMoviesPage();
      
      await waitFor(() => {
        expect(screen.getByTestId('movie-card-1')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('admin.searchMovies');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      await waitFor(() => {
        expect(screen.getByText('admin.noMoviesFound')).toBeInTheDocument();
      });
    });

  });

  describe('Error Handling', () => {
    it('shows error state when network fails', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      renderMoviesPage();
      
      await waitFor(() => {
        expect(screen.getByTestId('api-error')).toBeInTheDocument();
        expect(screen.getByTestId('api-error')).toHaveAttribute('data-type', 'network');
      });

      consoleError.mockRestore();
    });

    it('shows error state when server returns error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      });

      renderMoviesPage();
      
      await waitFor(() => {
        expect(screen.getByTestId('api-error')).toBeInTheDocument();
        expect(screen.getByTestId('api-error')).toHaveAttribute('data-type', 'server');
      });
    });

    it('allows retry after error', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ movies: mockMovies }),
        });

      renderMoviesPage();
      
      await waitFor(() => {
        expect(screen.getByTestId('api-error')).toBeInTheDocument();
      });

      // Click retry button
      fireEvent.click(screen.getByText('Retry'));

      await waitFor(() => {
        expect(screen.getByTestId('movie-card-1')).toBeInTheDocument();
      });

      consoleError.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('has accessible search input', async () => {
      renderMoviesPage();
      
      const searchInput = screen.getByPlaceholderText('admin.searchMovies');
      expect(searchInput).toHaveAttribute('type', 'text');
    });

    it('has accessible filter buttons', async () => {
      renderMoviesPage();
      
      const allButton = screen.getByText('movies.all');
      const featureButton = screen.getByText('movies.feature');
      const shortButton = screen.getByText('movies.short');

      expect(allButton).toBeInTheDocument();
      expect(featureButton).toBeInTheDocument();
      expect(shortButton).toBeInTheDocument();
    });
  });
});
