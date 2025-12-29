/**
 * HeroSection Component Tests
 * 
 * Tests the homepage hero section including video playback, auto-pause on scroll,
 * and responsive behavior.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HeroSection } from '../hero-section';
import type { Movie } from '@/lib/types';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

// Mock next-intl routing
jest.mock('@/i18n/routing', () => ({
  Link: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock HLS.js
const mockHlsInstance = {
  loadSource: jest.fn(),
  attachMedia: jest.fn(),
  on: jest.fn(),
  destroy: jest.fn(),
};

jest.mock('hls.js', () => {
  const MockHls: any = jest.fn().mockImplementation(() => mockHlsInstance);
  MockHls.isSupported = jest.fn(() => true);
  MockHls.Events = {
    MANIFEST_PARSED: 'hlsManifestParsed',
    ERROR: 'hlsError',
  };
  return {
    __esModule: true,
    default: MockHls,
  };
});

const mockMovie: Movie = {
  id: 'test-movie-id',
  slug: 'test-movie',
  title: { en: 'Test Movie', lo: 'ທົດສອບ' },
  overview: { en: 'Test overview', lo: 'ພາບລວມທົດສອບ' },
  tagline: { en: 'Test tagline', lo: 'ແທັກທົດສອບ' },
  backdrop_path: '/test-backdrop.jpg',
  poster_path: '/test-poster.jpg',
  release_date: '2023-01-01',
  runtime: 120,
  vote_average: 8.5,
  vote_count: 100,
  popularity: 50,
  adult: false,
  video: false,
  original_language: 'en',
  original_title: 'Test Movie',
  status: 'Released',
  budget: 1000000,
  revenue: 5000000,
  homepage: null,
  imdb_id: 'tt1234567',
  tmdb_id: 12345,
  genres: [],
  production_companies: [],
  production_countries: [],
  spoken_languages: [],
  keywords: [],
  cast: [],
  crew: [
    {
      id: 'crew-1',
      job: 'Director',
      department: 'Directing',
      credit_id: 'credit-1',
      person: {
        id: 'person-1',
        name: { en: 'Test Director', lo: 'ຜູ້ກຳກັບທົດສອບ' },
        profile_path: null,
        tmdb_id: 123,
        imdb_id: null,
        biography: null,
        birthday: null,
        deathday: null,
        place_of_birth: null,
        gender: 0,
        known_for_department: 'Directing',
        popularity: 10,
        adult: false,
      },
    },
  ],
  trailers: [
    {
      id: 'trailer-1',
      type: 'video',
      name: 'Test Trailer',
      video_url: 'http://localhost:3002/trailers/hls/test-movie/master.m3u8',
      video_format: 'hls',
      video_quality: '1080p',
      official: true,
      language: 'en',
      order: 0,
    },
  ],
  images: [],
  videos: [],
  similar: [],
  recommendations: [],
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
};

describe('HeroSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock HTMLVideoElement methods
    HTMLVideoElement.prototype.play = jest.fn(() => Promise.resolve());
    HTMLVideoElement.prototype.pause = jest.fn();
    HTMLVideoElement.prototype.load = jest.fn();
    
    // Mock getBoundingClientRect
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      top: 0,
      bottom: 400,
      height: 400,
      width: 1000,
      left: 0,
      right: 1000,
      x: 0,
      y: 0,
      toJSON: () => {},
    }));
  });

  it('renders movie title and metadata', () => {
    render(<HeroSection movies={[mockMovie]} />);
    
    expect(screen.getByText('Test Movie')).toBeInTheDocument();
    expect(screen.getByText('2023')).toBeInTheDocument();
    expect(screen.getByText(/120.*movie.minutes/)).toBeInTheDocument();
    expect(screen.getByText(/movie.directedBy.*Test Director/)).toBeInTheDocument();
  });

  it('renders tagline when present', () => {
    render(<HeroSection movies={[mockMovie]} />);
    
    expect(screen.getByText('Test tagline')).toBeInTheDocument();
  });

  it('renders overview on desktop (hidden on mobile)', () => {
    render(<HeroSection movies={[mockMovie]} />);
    
    const overview = screen.getByText('Test overview');
    expect(overview).toBeInTheDocument();
    expect(overview).toHaveClass('hidden', 'md:block');
  });

  it('renders More Info button with correct link', () => {
    render(<HeroSection movies={[mockMovie]} />);
    
    const moreInfoButton = screen.getByRole('link', { name: /home.moreInfo/i });
    expect(moreInfoButton).toBeInTheDocument();
    expect(moreInfoButton).toHaveAttribute('href', '/movies/test-movie');
  });

  it('initializes HLS player when video trailer is available', async () => {
    render(<HeroSection movies={[mockMovie]} />);
    
    await waitFor(() => {
      expect(mockHlsInstance.loadSource).toHaveBeenCalledWith(
        'http://localhost:3002/trailers/hls/test-movie/master.m3u8'
      );
      expect(mockHlsInstance.attachMedia).toHaveBeenCalled();
    });
  });

  it('shows play/pause button when video is ready', async () => {
    render(<HeroSection movies={[mockMovie]} />);
    
    // Simulate video ready
    const video = document.querySelector('video');
    if (video) {
      fireEvent.canPlay(video);
    }
    
    await waitFor(() => {
      const playPauseButton = screen.getByLabelText(/Pause|Play/i);
      expect(playPauseButton).toBeInTheDocument();
    });
  });

  it('toggles play/pause when button is clicked', async () => {
    const { container } = render(<HeroSection movies={[mockMovie]} />);
    
    const video = container.querySelector('video');
    if (video) {
      fireEvent.canPlay(video);
    }
    
    await waitFor(() => {
      expect(screen.getByLabelText('Pause')).toBeInTheDocument();
    });
    
    const pauseButton = screen.getByLabelText('Pause');
    fireEvent.click(pauseButton);
    
    expect(HTMLVideoElement.prototype.pause).toHaveBeenCalled();
  });

  it('pauses video when scrolled off screen', async () => {
    const { container } = render(<HeroSection movies={[mockMovie]} />);
    
    const video = container.querySelector('video');
    if (video) {
      fireEvent.canPlay(video);
      Object.defineProperty(video, 'paused', { value: false, writable: true });
    }
    
    // Mock getBoundingClientRect to simulate scrolled position (less than 50% visible)
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      top: -250, // More than half scrolled off
      bottom: 150,
      height: 400,
      width: 1000,
      left: 0,
      right: 1000,
      x: 0,
      y: 0,
      toJSON: () => {},
    }));
    
    // Trigger scroll event
    fireEvent.scroll(window);
    
    await waitFor(() => {
      expect(HTMLVideoElement.prototype.pause).toHaveBeenCalled();
    });
  });

  it('accounts for fixed header in visibility calculation', async () => {
    const { container } = render(<HeroSection movies={[mockMovie]} />);
    
    const video = container.querySelector('video');
    if (video) {
      fireEvent.canPlay(video);
      Object.defineProperty(video, 'paused', { value: false, writable: true });
    }
    
    // Mock position where hero is just below header (120px)
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      top: 120, // At header boundary
      bottom: 520,
      height: 400,
      width: 1000,
      left: 0,
      right: 1000,
      x: 0,
      y: 0,
      toJSON: () => {},
    }));
    
    // Trigger scroll event
    fireEvent.scroll(window);
    
    // Should still be considered fully visible (not paused)
    expect(HTMLVideoElement.prototype.pause).not.toHaveBeenCalled();
  });

  it('loops video at specified clip duration with single movie', async () => {
    const { container } = render(<HeroSection movies={[mockMovie]} clipDuration={10} />);
    
    const video = container.querySelector('video') as HTMLVideoElement;
    if (video) {
      Object.defineProperty(video, 'currentTime', { value: 11, writable: true });
      fireEvent.timeUpdate(video);
      
      // Should reset to 0 when exceeding clip duration
      expect(video.currentTime).toBe(0);
    }
  });

  it('falls back to backdrop image when no video trailer', () => {
    const movieWithoutTrailer = { ...mockMovie, trailers: [] };
    render(<HeroSection movies={[movieWithoutTrailer]} />);
    
    const backdrop = document.querySelector('[style*="background-image"]');
    expect(backdrop).toBeInTheDocument();
  });

  it('cleans up HLS instance on unmount', () => {
    const { unmount } = render(<HeroSection movies={[mockMovie]} />);
    
    unmount();
    
    expect(mockHlsInstance.destroy).toHaveBeenCalled();
  });

  it('shows indicator dots when multiple movies with trailers', () => {
    const secondMovie = { ...mockMovie, id: 'movie-2', slug: 'movie-2' };
    render(<HeroSection movies={[mockMovie, secondMovie]} />);
    
    // Should have 2 indicator dots
    const dots = screen.getAllByLabelText(/View trailer/);
    expect(dots).toHaveLength(2);
  });

  it('does not show indicator dots with single movie', () => {
    render(<HeroSection movies={[mockMovie]} />);
    
    // Should not have indicator dots
    const dots = screen.queryAllByLabelText(/View trailer/);
    expect(dots).toHaveLength(0);
  });
});
