/**
 * Shared test utilities for web tests
 * 
 * Provides common mocks and helpers used across multiple test files.
 */

/**
 * Simple localStorage mock (no jest.fn wrappers)
 */
export interface LocalStorageMock {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  readonly length: number;
  key: (index: number) => string | null;
}

/**
 * Jest-wrapped localStorage mock (with spy capabilities)
 */
export interface JestLocalStorageMock {
  getItem: jest.Mock<string | null, [string]>;
  setItem: jest.Mock<void, [string, string]>;
  removeItem: jest.Mock<void, [string]>;
  clear: jest.Mock<void, []>;
  readonly length: number;
  key: jest.Mock<string | null, [number]>;
}

/**
 * Creates a mock localStorage object for testing.
 * Use with: Object.defineProperty(global, 'localStorage', { value: createLocalStorageMock() });
 * 
 * @param useJestFn - If true, uses jest.fn() for methods (allows spy assertions). Default false.
 */
export function createLocalStorageMock(useJestFn: true): JestLocalStorageMock;
export function createLocalStorageMock(useJestFn?: false): LocalStorageMock;
export function createLocalStorageMock(useJestFn = false): LocalStorageMock | JestLocalStorageMock {
  let store: Record<string, string> = {};
  
  const getItem = (key: string) => store[key] || null;
  const setItem = (key: string, value: string) => { store[key] = value; };
  const removeItem = (key: string) => { delete store[key]; };
  const clear = () => { store = {}; };
  const length = () => Object.keys(store).length;
  const key = (index: number) => Object.keys(store)[index] || null;
  
  if (useJestFn) {
    return {
      getItem: jest.fn(getItem),
      setItem: jest.fn(setItem),
      removeItem: jest.fn(removeItem),
      clear: jest.fn(clear),
      get length() { return length(); },
      key: jest.fn(key),
    };
  }
  
  return {
    getItem,
    setItem,
    removeItem,
    clear,
    get length() { return length(); },
    key,
  };
}

/**
 * Sets up localStorage mock on global object.
 * Returns the mock for use in tests.
 */
export function setupLocalStorageMock(useJestFn: true): JestLocalStorageMock;
export function setupLocalStorageMock(useJestFn?: false): LocalStorageMock;
export function setupLocalStorageMock(useJestFn?: boolean): LocalStorageMock | JestLocalStorageMock {
  const mock = useJestFn ? createLocalStorageMock(true) : createLocalStorageMock();
  Object.defineProperty(global, 'localStorage', { value: mock, writable: true });
  return mock;
}

/**
 * Creates a mock navigator object for testing.
 */
export function setupNavigatorMock(overrides: Partial<Navigator> = {}) {
  Object.defineProperty(global, 'navigator', {
    value: {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Test Browser',
      language: 'en-US',
      ...overrides,
    },
    configurable: true,
  });
}

/**
 * Creates a mock screen object for testing.
 */
export function setupScreenMock(overrides: Partial<Screen> = {}) {
  Object.defineProperty(global, 'screen', {
    value: {
      width: 1920,
      height: 1080,
      colorDepth: 24,
      ...overrides,
    },
    configurable: true,
  });
}

/**
 * Creates a mock window.innerWidth for testing responsive behavior.
 */
export function setWindowWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { value: width, writable: true });
}

/**
 * Creates a test WatchSession object for analytics tests.
 */
export function createTestWatchSession(overrides: Record<string, any> = {}) {
  return {
    id: `session-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    viewerId: 'test-viewer',
    movieId: 'movie-123',
    movieTitle: 'Test Movie',
    startedAt: Date.now(),
    lastActiveAt: Date.now(),
    totalWatchTime: 0,
    maxProgress: 0,
    completed: false,
    duration: 7200,
    deviceType: 'desktop' as const,
    source: 'test',
    playCount: 1,
    ...overrides,
  };
}

/**
 * Creates a test AnalyticsEvent object.
 */
export function createTestAnalyticsEvent(overrides: Record<string, any> = {}) {
  return {
    type: 'movie_start' as const,
    sessionId: 'session-123',
    movieId: 'movie-123',
    movieTitle: 'Test Movie',
    timestamp: Date.now(),
    data: {},
    ...overrides,
  };
}

/**
 * Sets up a mock fetch function on global object.
 * Returns the mock for use in tests.
 */
export function setupFetchMock() {
  const mockFetch = jest.fn();
  global.fetch = mockFetch;
  return mockFetch;
}
