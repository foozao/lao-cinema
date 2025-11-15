// Test helper functions and fixtures

import type { Movie } from '../db/schema.js';

/**
 * Create a sample movie object for testing
 */
export function createSampleMovie(overrides?: Partial<Movie>): Omit<Movie, 'id' | 'created_at' | 'updated_at'> {
  return {
    tmdb_id: 550,
    imdb_id: 'tt0137523',
    tmdb_last_synced: new Date(),
    tmdb_sync_enabled: true,
    
    title: { en: 'Fight Club', lo: 'ສະໂມສອນ' },
    overview: {
      en: 'An insomniac office worker and a devil-may-care soap maker form an underground fight club.',
      lo: 'ພະນັກງານຫ້ອງການທີ່ນອນບໍ່ຫລັບ ແລະ ຊ່າງເຮັດສະບູທີ່ບໍ່ສົນໃຈຫຍັງ ໄດ້ສ້າງສະໂມສອນໃຕ້ດິນ.',
    },
    tagline: { en: 'Mischief. Mayhem. Soap.', lo: undefined },
    
    original_title: 'Fight Club',
    original_language: 'en',
    poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
    backdrop_path: '/fCayJrkfRaCRCTh8GqN30f8oyQF.jpg',
    release_date: '1999-10-15',
    runtime: 139,
    vote_average: 8.4,
    vote_count: 26000,
    popularity: 61.416,
    adult: false,
    video: false,
    
    budget: 63000000,
    revenue: 100853753,
    status: 'Released',
    homepage: 'http://www.foxmovies.com/movies/fight-club',
    
    genres: [
      { id: 18, name: { en: 'Drama', lo: 'ລະຄອນ' } },
    ],
    production_companies: [
      {
        id: 508,
        name: '20th Century Fox',
        logo_path: '/7PzJdsLGlR7oW4J0J5Xcd0pHGRg.png',
        origin_country: 'US',
      },
    ],
    production_countries: [
      { iso_3166_1: 'US', name: 'United States of America' },
    ],
    spoken_languages: [
      { iso_639_1: 'en', english_name: 'English', name: 'English' },
    ],
    belongs_to_collection: null,
    
    video_sources: [
      {
        id: 'vs1',
        quality: '1080p',
        format: 'hls',
        url: 'https://example.com/fight-club.m3u8',
        size_bytes: 5000000000,
      },
    ],
    
    cast: [
      {
        id: 287,
        name: { en: 'Brad Pitt', lo: undefined },
        character: { en: 'Tyler Durden', lo: undefined },
        profile_path: '/cckcYc2v0yh1tc9QjRelptcOBko.jpg',
        order: 0,
      },
    ],
    
    crew: [
      {
        id: 7467,
        name: { en: 'David Fincher', lo: undefined },
        job: { en: 'Director', lo: 'ຜູ້ກຳກັບ' },
        department: 'Directing',
        profile_path: '/tpEczFclQZeKAiCeKZZ0adRvtfz.jpg',
      },
    ],
    
    ...overrides,
  };
}

/**
 * Create a minimal movie object (only required fields)
 */
export function createMinimalMovie(overrides?: any): any {
  return {
    title: { en: 'Test Movie' },
    overview: { en: 'A test movie' },
    release_date: '2024-01-01',
    adult: false,
    genres: [],
    video_sources: [],
    cast: [],
    crew: [],
    ...overrides,
  };
}
