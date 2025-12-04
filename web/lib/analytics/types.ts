// Analytics types for video playback tracking

export interface WatchSession {
  id: string;
  viewerId: string;            // Persistent viewer ID (stays same across sessions)
  movieId: string;
  movieTitle: string;
  startedAt: number;           // Unix timestamp
  lastActiveAt: number;        // Unix timestamp of last activity
  endedAt?: number;            // Unix timestamp when session ended
  totalWatchTime: number;      // Seconds actually watched
  maxProgress: number;         // Furthest point reached (0-100%)
  completed: boolean;          // Watched >90%
  duration: number;            // Movie duration in seconds
  deviceType: 'mobile' | 'tablet' | 'desktop';
  source: string;              // How they found it (homepage, search, direct)
  playCount: number;           // How many times play was pressed in this session
}

export interface MovieAnalytics {
  movieId: string;
  movieTitle: string;
  totalViews: number;          // Total number of watch sessions
  uniqueViewers: number;       // Unique session IDs that watched
  totalWatchTime: number;      // Total seconds watched across all sessions
  completions: number;         // Number of times movie was completed (>90%)
  averageWatchTime: number;    // Average seconds per session
  completionRate: number;      // Percentage of views that completed
  averageProgress: number;     // Average furthest point reached (0-100%)
  lastWatched?: number;        // Last watch timestamp
}

export interface AnalyticsEvent {
  type: 'movie_start' | 'movie_progress' | 'movie_pause' | 'movie_complete' | 'movie_end';
  sessionId: string;
  movieId: string;
  movieTitle: string;
  timestamp: number;
  data: {
    currentTime?: number;      // Current playback position in seconds
    duration?: number;         // Movie duration in seconds
    progress?: number;         // Percentage watched (0-100)
    watchTime?: number;        // Cumulative watch time this session
  };
}

export interface AnalyticsSummary {
  totalWatchTime: number;      // Total seconds across all movies
  totalSessions: number;       // Total watch sessions
  uniqueViewers: number;       // Unique viewer count
  totalCompletions: number;    // Total completions
  averageSessionLength: number; // Average session length in seconds
  movieStats: MovieAnalytics[];
  topMovies: {
    byWatchTime: MovieAnalytics[];
    byCompletionRate: MovieAnalytics[];
    byViews: MovieAnalytics[];
  };
  recentActivity: WatchSession[];
}

// Progress tracking interval (30 seconds)
export const PROGRESS_INTERVAL_MS = 30000;

// Completion threshold (90%)
export const COMPLETION_THRESHOLD = 0.9;
