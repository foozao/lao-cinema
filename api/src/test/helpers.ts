// Test helper functions and fixtures

import type { Movie } from '../db/schema.js';

/**
 * Create a sample movie object for testing (API request format with snake_case)
 */
export function createSampleMovie(overrides?: any): any {
  return {
    tmdb_id: 15,
    imdb_id: 'tt0033467',
    original_title: 'Citizen Kane',
    original_language: 'en',
    poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
    backdrop_path: '/fCayJrkfRaCRCTh8GqN30f8oyQF.jpg',
    release_date: '1941-05-01',
    runtime: 119,
    vote_average: 8.4,
    vote_count: 26000,
    popularity: 61.416,
    adult: false,
    title: {
      en: 'Citizen Kane',
      lo: 'ສະໂມສອນ',
    },
    overview: {
      en: 'Newspaper magnate Charles Foster Kane is taken from his mother as a boy and made the ward of a rich industrialist.',
      lo: 'ເລື່ອງຂອງຊາຍຄົນໜຶ່ງທີ່ມີອາການນອນບໍ່ຫລັບ...',
    },
    genres: [
      {
        id: 18,
        name: { en: 'Drama', lo: 'ລະຄອນ' },
      },
    ],
    cast: [
      {
        person: {
          id: 40,
          name: { en: 'Orson Welles', lo: 'ອໍສັນ ເວລສ໌' },
          profile_path: '/oTBfvS3xfVl1MYJTukCykXkU0a.jpg',
        },
        character: { en: 'Charles Foster Kane', lo: 'ຊາລສ໌ ຟໍສເຕີ ເຄນ' },
        order: 0,
      },
    ],
    video_sources: [],
    ...overrides,
  };
}

/**
 * Create a minimal movie object (only required fields for API request)
 */
export function createMinimalMovie(overrides?: any): any {
  return {
    original_title: 'Test Movie',
    release_date: '2024-01-01',
    adult: false,
    title: {
      en: 'Test Movie',
    },
    overview: {
      en: 'A test movie',
    },
    genres: [],
    video_sources: [],
    ...overrides,
  };
}

/**
 * Create sample movie images for testing (API request format with snake_case)
 */
export function createSampleImages() {
  return [
    {
      type: 'poster' as const,
      file_path: '/poster1.jpg',
      aspect_ratio: 0.667,
      height: 3000,
      width: 2000,
      iso_639_1: 'en',
      vote_average: 5.3,
      vote_count: 10,
      is_primary: true,
    },
    {
      type: 'poster' as const,
      file_path: '/poster2.jpg',
      aspect_ratio: 0.667,
      height: 3000,
      width: 2000,
      iso_639_1: 'lo',
      vote_average: 4.8,
      vote_count: 5,
      is_primary: false,
    },
    {
      type: 'backdrop' as const,
      file_path: '/backdrop1.jpg',
      aspect_ratio: 1.778,
      height: 1080,
      width: 1920,
      iso_639_1: null,
      vote_average: 5.5,
      vote_count: 8,
      is_primary: true,
    },
    {
      type: 'logo' as const,
      file_path: '/logo1.png',
      aspect_ratio: 2.5,
      height: 200,
      width: 500,
      iso_639_1: 'en',
      vote_average: 5.0,
      vote_count: 3,
      is_primary: false,
    },
  ];
}
