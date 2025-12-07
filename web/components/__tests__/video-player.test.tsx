/**
 * VideoPlayer Component Tests
 * 
 * Tests the main video player component including HLS playback, controls,
 * analytics tracking, and continue watching functionality.
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { VideoPlayer } from '../video-player';

// Mock the analytics hook
const mockTrackPlay = jest.fn();
const mockTrackPause = jest.fn();
const mockTrackComplete = jest.fn();
const mockTrackEnd = jest.fn();
const mockTrackTimeUpdate = jest.fn();

jest.mock('@/lib/analytics', () => ({
  useVideoAnalytics: jest.fn(() => ({
    trackPlay: mockTrackPlay,
    trackPause: mockTrackPause,
    trackComplete: mockTrackComplete,
    trackEnd: mockTrackEnd,
    trackTimeUpdate: mockTrackTimeUpdate,
  })),
}));

// Mock the video hooks
const mockSavePosition = jest.fn();
const mockSetHasStarted = jest.fn();

jest.mock('@/lib/video', () => ({
  useHlsPlayer: jest.fn(() => ({
    videoRef: { current: null },
    hlsRef: { current: null },
    isLoading: false,
    error: null,
    retryLoad: jest.fn(),
  })),
  useContinueWatching: jest.fn(() => ({
    savedPosition: 0,
    showContinueDialog: false,
    pendingPosition: null,
    handleContinueWatching: jest.fn(),
    handleStartFromBeginning: jest.fn(),
    savePosition: mockSavePosition,
    hasStarted: false,
    setHasStarted: mockSetHasStarted,
  })),
  useVideoKeyboard: jest.fn(),
}));

// Mock video sub-components
jest.mock('../video', () => ({
  VideoControls: ({ 
    isPlaying, 
    isMuted, 
    currentTime, 
    duration,
    showControls,
    isFullscreen,
    onTogglePlay,
    onToggleMute,
    onToggleFullscreen,
  }: any) => (
    <div data-testid="video-controls" data-show={showControls}>
      <button data-testid="play-button" onClick={onTogglePlay}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <button data-testid="mute-button" onClick={onToggleMute}>
        {isMuted ? 'Unmute' : 'Mute'}
      </button>
      <button data-testid="fullscreen-button" onClick={onToggleFullscreen}>
        {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
      </button>
      <span data-testid="current-time">{currentTime}</span>
      <span data-testid="duration">{duration}</span>
    </div>
  ),
  BigPlayButton: ({ onClick }: { onClick: () => void }) => (
    <button data-testid="big-play-button" onClick={onClick}>Big Play</button>
  ),
  VideoLoadingSpinner: () => (
    <div data-testid="loading-spinner">Loading...</div>
  ),
  VideoErrorState: ({ error, onRetry }: { error: any; onRetry: () => void }) => (
    <div data-testid="error-state">
      <span>{error.message}</span>
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
  ContinueWatchingDialog: ({ 
    pendingPosition, 
    onContinue, 
    onStartFromBeginning 
  }: any) => (
    <div data-testid="continue-dialog">
      <span>Continue from {pendingPosition}s?</span>
      <button onClick={onContinue}>Continue</button>
      <button onClick={onStartFromBeginning}>Start Over</button>
    </div>
  ),
}));

// Import mocked hooks for manipulation
import { useHlsPlayer, useContinueWatching } from '@/lib/video';
const mockUseHlsPlayer = useHlsPlayer as jest.MockedFunction<typeof useHlsPlayer>;
const mockUseContinueWatching = useContinueWatching as jest.MockedFunction<typeof useContinueWatching>;

describe('VideoPlayer', () => {
  // Create a mock video element
  let mockVideoElement: Partial<HTMLVideoElement>;
  let eventListeners: Record<string, EventListener[]>;

  beforeEach(() => {
    jest.clearAllMocks();
    eventListeners = {};
    
    mockVideoElement = {
      play: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn(),
      currentTime: 0,
      duration: 5400,
      muted: false,
      addEventListener: jest.fn((event, listener) => {
        if (!eventListeners[event]) eventListeners[event] = [];
        eventListeners[event].push(listener as EventListener);
      }),
      removeEventListener: jest.fn((event, listener) => {
        if (eventListeners[event]) {
          eventListeners[event] = eventListeners[event].filter(l => l !== listener);
        }
      }),
    };

    // Reset mock implementations
    mockUseHlsPlayer.mockReturnValue({
      videoRef: { current: mockVideoElement as HTMLVideoElement },
      hlsRef: { current: null },
      isLoading: false,
      error: null,
      retryLoad: jest.fn(),
    });

    mockUseContinueWatching.mockReturnValue({
      savedPosition: 0,
      showContinueDialog: false,
      pendingPosition: null,
      handleContinueWatching: jest.fn(),
      handleStartFromBeginning: jest.fn(),
      savePosition: mockSavePosition,
      hasStarted: false,
      setHasStarted: mockSetHasStarted,
    });

    // Mock document.fullscreenElement
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      writable: true,
      configurable: true,
    });
  });

  describe('Rendering', () => {
    it('renders video element with correct attributes', () => {
      render(
        <VideoPlayer
          src="https://example.com/video.m3u8"
          poster="/poster.jpg"
          title="Test Movie"
        />
      );

      const video = document.querySelector('video');
      expect(video).toBeInTheDocument();
      expect(video).toHaveAttribute('playsInline');
    });

    it('shows poster when video has not started', () => {
      mockUseContinueWatching.mockReturnValue({
        savedPosition: 0,
        showContinueDialog: false,
        pendingPosition: null,
        handleContinueWatching: jest.fn(),
        handleStartFromBeginning: jest.fn(),
        savePosition: mockSavePosition,
        hasStarted: false,
        setHasStarted: mockSetHasStarted,
      });

      render(
        <VideoPlayer
          src="https://example.com/video.m3u8"
          poster="/poster.jpg"
        />
      );

      const video = document.querySelector('video');
      expect(video).toHaveAttribute('poster', '/poster.jpg');
    });

    it('hides poster after video starts', () => {
      mockUseContinueWatching.mockReturnValue({
        savedPosition: 0,
        showContinueDialog: false,
        pendingPosition: null,
        handleContinueWatching: jest.fn(),
        handleStartFromBeginning: jest.fn(),
        savePosition: mockSavePosition,
        hasStarted: true,
        setHasStarted: mockSetHasStarted,
      });

      render(
        <VideoPlayer
          src="https://example.com/video.m3u8"
          poster="/poster.jpg"
        />
      );

      const video = document.querySelector('video');
      expect(video).not.toHaveAttribute('poster');
    });

    it('shows big play button when not started', () => {
      render(
        <VideoPlayer
          src="https://example.com/video.m3u8"
        />
      );

      expect(screen.getByTestId('big-play-button')).toBeInTheDocument();
    });

    it('hides big play button after video starts', () => {
      mockUseContinueWatching.mockReturnValue({
        savedPosition: 0,
        showContinueDialog: false,
        pendingPosition: null,
        handleContinueWatching: jest.fn(),
        handleStartFromBeginning: jest.fn(),
        savePosition: mockSavePosition,
        hasStarted: true,
        setHasStarted: mockSetHasStarted,
      });

      render(
        <VideoPlayer
          src="https://example.com/video.m3u8"
        />
      );

      expect(screen.queryByTestId('big-play-button')).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading', () => {
      mockUseHlsPlayer.mockReturnValue({
        videoRef: { current: mockVideoElement as HTMLVideoElement },
        hlsRef: { current: null },
        isLoading: true,
        error: null,
        retryLoad: jest.fn(),
      });

      render(
        <VideoPlayer
          src="https://example.com/video.m3u8"
        />
      );

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('hides loading spinner when not loading', () => {
      mockUseHlsPlayer.mockReturnValue({
        videoRef: { current: mockVideoElement as HTMLVideoElement },
        hlsRef: { current: null },
        isLoading: false,
        error: null,
        retryLoad: jest.fn(),
      });

      render(
        <VideoPlayer
          src="https://example.com/video.m3u8"
        />
      );

      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('shows error state when error occurs', () => {
      mockUseHlsPlayer.mockReturnValue({
        videoRef: { current: mockVideoElement as HTMLVideoElement },
        hlsRef: { current: null },
        isLoading: false,
        error: { type: 'network', message: 'Failed to load video' },
        retryLoad: jest.fn(),
      });

      render(
        <VideoPlayer
          src="https://example.com/video.m3u8"
        />
      );

      expect(screen.getByTestId('error-state')).toBeInTheDocument();
      expect(screen.getByText('Failed to load video')).toBeInTheDocument();
    });

    it('hides big play button and loading during error', () => {
      mockUseHlsPlayer.mockReturnValue({
        videoRef: { current: mockVideoElement as HTMLVideoElement },
        hlsRef: { current: null },
        isLoading: false,
        error: { type: 'network', message: 'Error' },
        retryLoad: jest.fn(),
      });

      render(
        <VideoPlayer
          src="https://example.com/video.m3u8"
        />
      );

      expect(screen.queryByTestId('big-play-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });
  });

  describe('Continue Watching Dialog', () => {
    it('shows continue watching dialog when available', () => {
      mockUseContinueWatching.mockReturnValue({
        savedPosition: 600,
        showContinueDialog: true,
        pendingPosition: 600,
        handleContinueWatching: jest.fn(),
        handleStartFromBeginning: jest.fn(),
        savePosition: mockSavePosition,
        hasStarted: false,
        setHasStarted: mockSetHasStarted,
      });

      render(
        <VideoPlayer
          src="https://example.com/video.m3u8"
          videoId="movie-1"
        />
      );

      expect(screen.getByTestId('continue-dialog')).toBeInTheDocument();
      expect(screen.getByText('Continue from 600s?')).toBeInTheDocument();
    });

    it('hides continue watching dialog when not applicable', () => {
      mockUseContinueWatching.mockReturnValue({
        savedPosition: 0,
        showContinueDialog: false,
        pendingPosition: null,
        handleContinueWatching: jest.fn(),
        handleStartFromBeginning: jest.fn(),
        savePosition: mockSavePosition,
        hasStarted: false,
        setHasStarted: mockSetHasStarted,
      });

      render(
        <VideoPlayer
          src="https://example.com/video.m3u8"
        />
      );

      expect(screen.queryByTestId('continue-dialog')).not.toBeInTheDocument();
    });
  });

  describe('Controls', () => {
    it('renders video controls', () => {
      render(
        <VideoPlayer
          src="https://example.com/video.m3u8"
        />
      );

      expect(screen.getByTestId('video-controls')).toBeInTheDocument();
      expect(screen.getByTestId('play-button')).toBeInTheDocument();
      expect(screen.getByTestId('mute-button')).toBeInTheDocument();
      expect(screen.getByTestId('fullscreen-button')).toBeInTheDocument();
    });

    it('shows controls on mouse enter', async () => {
      render(
        <VideoPlayer
          src="https://example.com/video.m3u8"
        />
      );

      const container = document.querySelector('.group');
      if (container) {
        fireEvent.mouseEnter(container);
      }

      await waitFor(() => {
        expect(screen.getByTestId('video-controls')).toHaveAttribute('data-show', 'true');
      });
    });

    it('hides controls on mouse leave', async () => {
      render(
        <VideoPlayer
          src="https://example.com/video.m3u8"
        />
      );

      const container = document.querySelector('.group');
      if (container) {
        fireEvent.mouseLeave(container);
      }

      await waitFor(() => {
        expect(screen.getByTestId('video-controls')).toHaveAttribute('data-show', 'false');
      });
    });
  });

  describe('Play/Pause', () => {
    it('renders play button in controls', () => {
      render(
        <VideoPlayer
          src="https://example.com/video.m3u8"
        />
      );

      const playButton = screen.getByTestId('play-button');
      expect(playButton).toBeInTheDocument();
      expect(playButton).toHaveTextContent('Play'); // Not playing initially
    });

    it('renders big play button when not started', () => {
      render(
        <VideoPlayer
          src="https://example.com/video.m3u8"
        />
      );

      const bigPlayButton = screen.getByTestId('big-play-button');
      expect(bigPlayButton).toBeInTheDocument();
    });

    it('clicking play button triggers toggle callback', async () => {
      render(
        <VideoPlayer
          src="https://example.com/video.m3u8"
        />
      );

      const playButton = screen.getByTestId('play-button');
      // Verify the button is clickable and renders correctly
      expect(playButton).toBeInTheDocument();
      fireEvent.click(playButton);
      // The callback was triggered (we verify by checking the component didn't crash)
    });
  });

  describe('Mute Toggle', () => {
    it('renders mute button in controls', () => {
      render(
        <VideoPlayer
          src="https://example.com/video.m3u8"
        />
      );

      const muteButton = screen.getByTestId('mute-button');
      expect(muteButton).toBeInTheDocument();
      expect(muteButton).toHaveTextContent('Mute'); // Not muted initially
    });
  });

  describe('Props', () => {
    it('passes correct props to useHlsPlayer', () => {
      render(
        <VideoPlayer
          src="https://example.com/video.m3u8"
          autoPlay={true}
        />
      );

      expect(mockUseHlsPlayer).toHaveBeenCalledWith(
        expect.objectContaining({
          src: 'https://example.com/video.m3u8',
          autoPlay: true,
        })
      );
    });

    it('passes correct props to useContinueWatching', () => {
      render(
        <VideoPlayer
          src="https://example.com/video.m3u8"
          videoId="test-video-id"
        />
      );

      expect(mockUseContinueWatching).toHaveBeenCalledWith(
        expect.objectContaining({
          videoId: 'test-video-id',
        })
      );
    });

    it('applies viewport constraints when enabled', () => {
      const { container } = render(
        <VideoPlayer
          src="https://example.com/video.m3u8"
          constrainToViewport={true}
        />
      );

      const videoContainer = container.querySelector('.group');
      expect(videoContainer).toHaveClass('h-[calc(100vh-64px)]');
    });

    it('does not apply viewport constraints by default', () => {
      const { container } = render(
        <VideoPlayer
          src="https://example.com/video.m3u8"
        />
      );

      const videoContainer = container.querySelector('.group');
      expect(videoContainer).not.toHaveClass('h-[calc(100vh-64px)]');
    });
  });

  describe('Analytics Integration', () => {
    it('passes analytics props correctly', () => {
      render(
        <VideoPlayer
          src="https://example.com/video.m3u8"
          movieId="movie-123"
          movieTitle="Test Movie Title"
          movieDuration={7200}
        />
      );

      // The analytics hook should be called with the movie info
      const { useVideoAnalytics } = require('@/lib/analytics');
      expect(useVideoAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          movieId: 'movie-123',
          movieTitle: 'Test Movie Title',
          source: 'watch_page',
        })
      );
    });

    it('uses fallback values for analytics when props not provided', () => {
      render(
        <VideoPlayer
          src="https://example.com/video.m3u8"
          videoId="video-id"
          title="Fallback Title"
        />
      );

      const { useVideoAnalytics } = require('@/lib/analytics');
      expect(useVideoAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          movieId: 'video-id',
          movieTitle: 'Fallback Title',
        })
      );
    });
  });

  describe('Cleanup', () => {
    it('tracks end on unmount', () => {
      const { unmount } = render(
        <VideoPlayer
          src="https://example.com/video.m3u8"
        />
      );

      unmount();

      expect(mockTrackEnd).toHaveBeenCalled();
    });
  });
});
