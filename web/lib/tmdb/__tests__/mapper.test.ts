/**
 * TMDB Mapper Tests
 * 
 * Tests the complex data transformation from TMDB API responses
 * to our internal Movie/Person schema, including localization handling.
 */

import {
  mapTMDBToMovie,
  mapTMDBToPerson,
  getMissingTranslations,
  SYNCABLE_FIELDS,
} from '../mapper';
import type { TMDBMovieDetails, TMDBCredits, TMDBImages, TMDBVideos, TMDBPersonDetails } from '../client';
import type { Movie } from '../../types';

describe('TMDB Mapper', () => {
  // =============================================================================
  // mapTMDBToMovie TESTS
  // =============================================================================

  describe('mapTMDBToMovie', () => {
    const baseTMDBMovie: TMDBMovieDetails = {
      id: 12345,
      imdb_id: 'tt1234567',
      title: 'Test Movie',
      original_title: 'Test Movie Original',
      original_language: 'en',
      overview: 'A great test movie about testing.',
      tagline: 'Testing is believing',
      poster_path: '/poster.jpg',
      backdrop_path: '/backdrop.jpg',
      release_date: '2024-01-15',
      runtime: 120,
      vote_average: 7.5,
      vote_count: 1000,
      popularity: 50.5,
      adult: false,
      video: false,
      budget: 1000000,
      revenue: 5000000,
      status: 'Released',
      homepage: 'https://example.com',
      genres: [
        { id: 28, name: 'Action' },
        { id: 12, name: 'Adventure' },
      ],
      production_companies: [
        { id: 1, name: 'Studio One', logo_path: '/logo.png', origin_country: 'US' },
      ],
      production_countries: [
        { iso_3166_1: 'US', name: 'United States of America' },
      ],
      spoken_languages: [
        { iso_639_1: 'en', english_name: 'English', name: 'English' },
      ],
      belongs_to_collection: null,
    };

    describe('Basic Mapping', () => {
      it('should map basic movie details correctly', () => {
        const result = mapTMDBToMovie(baseTMDBMovie);

        expect(result.tmdb_id).toBe(12345);
        expect(result.imdb_id).toBe('tt1234567');
        expect(result.original_title).toBe('Test Movie Original');
        expect(result.original_language).toBe('en');
        expect(result.poster_path).toBe('/poster.jpg');
        expect(result.backdrop_path).toBe('/backdrop.jpg');
        expect(result.release_date).toBe('2024-01-15');
        expect(result.runtime).toBe(120);
        expect(result.vote_average).toBe(7.5);
        expect(result.vote_count).toBe(1000);
        expect(result.popularity).toBe(50.5);
        expect(result.adult).toBe(false);
        expect(result.video).toBe(false);
        expect(result.budget).toBe(1000000);
        expect(result.revenue).toBe(5000000);
        expect(result.status).toBe('Released');
        expect(result.homepage).toBe('https://example.com');
      });

      it('should create localized title with English only', () => {
        const result = mapTMDBToMovie(baseTMDBMovie);

        expect(result.title).toEqual({ en: 'Test Movie', lo: undefined });
      });

      it('should create localized overview with English only', () => {
        const result = mapTMDBToMovie(baseTMDBMovie);

        expect(result.overview).toEqual({ en: 'A great test movie about testing.', lo: undefined });
      });

      it('should create localized tagline when present', () => {
        const result = mapTMDBToMovie(baseTMDBMovie);

        expect(result.tagline).toEqual({ en: 'Testing is believing', lo: undefined });
      });

      it('should handle missing tagline', () => {
        const movie = { ...baseTMDBMovie, tagline: null };
        const result = mapTMDBToMovie(movie);

        expect(result.tagline).toBeUndefined();
      });

      it('should set tmdb_sync_enabled to true', () => {
        const result = mapTMDBToMovie(baseTMDBMovie);

        expect(result.tmdb_sync_enabled).toBe(true);
      });

      it('should set tmdb_last_synced to current time', () => {
        const before = new Date().toISOString();
        const result = mapTMDBToMovie(baseTMDBMovie);
        const after = new Date().toISOString();

        expect(result.tmdb_last_synced).toBeDefined();
        expect(result.tmdb_last_synced! >= before).toBe(true);
        expect(result.tmdb_last_synced! <= after).toBe(true);
      });
    });

    describe('Preserving Existing Lao Translations', () => {
      it('should preserve existing Lao title', () => {
        const existingMovie: Partial<Movie> = {
          title: { en: 'Old Title', lo: 'ຊື່ລາວ' },
        };

        const result = mapTMDBToMovie(baseTMDBMovie, undefined, undefined, undefined, existingMovie);

        expect(result.title).toEqual({ en: 'Test Movie', lo: 'ຊື່ລາວ' });
      });

      it('should preserve existing Lao overview', () => {
        const existingMovie: Partial<Movie> = {
          overview: { en: 'Old overview', lo: 'ພາບລວມລາວ' },
        };

        const result = mapTMDBToMovie(baseTMDBMovie, undefined, undefined, undefined, existingMovie);

        expect(result.overview).toEqual({ en: 'A great test movie about testing.', lo: 'ພາບລວມລາວ' });
      });

      it('should preserve existing Lao tagline', () => {
        const existingMovie: Partial<Movie> = {
          tagline: { en: 'Old tagline', lo: 'ຄຳຂວັນລາວ' },
        };

        const result = mapTMDBToMovie(baseTMDBMovie, undefined, undefined, undefined, existingMovie);

        expect(result.tagline).toEqual({ en: 'Testing is believing', lo: 'ຄຳຂວັນລາວ' });
      });

      it('should preserve existing Lao genre names', () => {
        const existingMovie: Partial<Movie> = {
          genres: [
            { id: 28, name: { en: 'Action', lo: 'ແອັກຊັ່ນ' } },
          ],
        };

        const result = mapTMDBToMovie(baseTMDBMovie, undefined, undefined, undefined, existingMovie);

        const actionGenre = result.genres.find(g => g.id === 28);
        expect(actionGenre?.name).toEqual({ en: 'Action', lo: 'ແອັກຊັ່ນ' });
      });
    });

    describe('Genre Mapping', () => {
      it('should map all genres', () => {
        const result = mapTMDBToMovie(baseTMDBMovie);

        expect(result.genres).toHaveLength(2);
        expect(result.genres[0].id).toBe(28);
        expect(result.genres[0].name.en).toBe('Action');
        expect(result.genres[1].id).toBe(12);
        expect(result.genres[1].name.en).toBe('Adventure');
      });
    });

    describe('Production Companies Mapping', () => {
      it('should map production companies', () => {
        const result = mapTMDBToMovie(baseTMDBMovie);

        expect(result.production_companies).toHaveLength(1);
        expect(result.production_companies![0]).toEqual({
          id: 1,
          name: 'Studio One',
          logo_path: '/logo.png',
          origin_country: 'US',
        });
      });

      it('should handle missing logo_path', () => {
        const movie = {
          ...baseTMDBMovie,
          production_companies: [
            { id: 1, name: 'Studio', logo_path: null, origin_country: 'US' },
          ],
        };

        const result = mapTMDBToMovie(movie);

        expect(result.production_companies![0].logo_path).toBeUndefined();
      });
    });

    describe('Collection Mapping', () => {
      it('should map collection when present', () => {
        const movie = {
          ...baseTMDBMovie,
          belongs_to_collection: {
            id: 100,
            name: 'Test Collection',
            poster_path: '/collection-poster.jpg',
            backdrop_path: '/collection-backdrop.jpg',
          },
        };

        const result = mapTMDBToMovie(movie);

        expect(result.belongs_to_collection).toBeDefined();
        expect(result.belongs_to_collection?.id).toBe(100);
        expect(result.belongs_to_collection?.name.en).toBe('Test Collection');
      });

      it('should return null for missing collection', () => {
        const result = mapTMDBToMovie(baseTMDBMovie);

        expect(result.belongs_to_collection).toBeNull();
      });

      it('should preserve existing Lao collection name', () => {
        const movie = {
          ...baseTMDBMovie,
          belongs_to_collection: {
            id: 100,
            name: 'Test Collection',
            poster_path: null,
            backdrop_path: null,
          },
        };
        const existingMovie: Partial<Movie> = {
          belongs_to_collection: {
            id: 100,
            name: { en: 'Old Name', lo: 'ຊື່ຊຸດລາວ' },
          },
        };

        const result = mapTMDBToMovie(movie, undefined, undefined, undefined, existingMovie);

        expect(result.belongs_to_collection?.name).toEqual({ en: 'Test Collection', lo: 'ຊື່ຊຸດລາວ' });
      });
    });

    describe('Cast Mapping', () => {
      const credits: TMDBCredits = {
        id: 12345,
        cast: [
          {
            id: 1,
            name: 'Actor One',
            character: 'Hero',
            profile_path: '/actor1.jpg',
            order: 0,
            gender: 2,
            known_for_department: 'Acting',
          },
          {
            id: 2,
            name: 'Actor Two',
            character: 'Villain',
            profile_path: '/actor2.jpg',
            order: 1,
            gender: 1,
            known_for_department: 'Acting',
          },
        ],
        crew: [],
      };

      it('should map cast members', () => {
        const result = mapTMDBToMovie(baseTMDBMovie, credits);

        expect(result.cast).toHaveLength(2);
        expect(result.cast[0].person.id).toBe(1);
        expect(result.cast[0].person.name.en).toBe('Actor One');
        expect(result.cast[0].character.en).toBe('Hero');
        expect(result.cast[0].order).toBe(0);
      });

      it('should limit cast to 20 members', () => {
        const largeCast = Array.from({ length: 30 }, (_, i) => ({
          id: i + 1,
          name: `Actor ${i + 1}`,
          character: `Character ${i + 1}`,
          profile_path: null,
          order: i,
          gender: 0,
          known_for_department: 'Acting',
        }));

        const result = mapTMDBToMovie(baseTMDBMovie, { id: 1, cast: largeCast, crew: [] });

        expect(result.cast).toHaveLength(20);
      });

      it('should preserve existing Lao cast names', () => {
        const existingMovie: Partial<Movie> = {
          cast: [
            {
              person: { id: 1, name: { en: 'Actor One', lo: 'ນັກສະແດງໜຶ່ງ' } },
              character: { en: 'Hero', lo: 'ພະເອກ' },
              order: 0,
            },
          ],
        };

        const result = mapTMDBToMovie(baseTMDBMovie, credits, undefined, undefined, existingMovie);

        expect(result.cast[0].person.name.lo).toBe('ນັກສະແດງໜຶ່ງ');
        expect(result.cast[0].character.lo).toBe('ພະເອກ');
      });
    });

    describe('Crew Mapping', () => {
      const credits: TMDBCredits = {
        id: 12345,
        cast: [],
        crew: [
          {
            id: 10,
            name: 'Director Name',
            job: 'Director',
            department: 'Directing',
            profile_path: '/director.jpg',
            gender: 2,
          },
          {
            id: 11,
            name: 'Writer Name',
            job: 'Screenplay',
            department: 'Writing',
            profile_path: null,
            gender: 1,
          },
        ],
      };

      it('should map crew members', () => {
        const result = mapTMDBToMovie(baseTMDBMovie, credits);

        expect(result.crew).toHaveLength(2);
        expect(result.crew[0].person.id).toBe(10);
        expect(result.crew[0].person.name.en).toBe('Director Name');
        expect(result.crew[0].job.en).toBe('Director');
        expect(result.crew[0].department).toBe('Directing');
      });

      it('should auto-translate common job titles to Lao', () => {
        const result = mapTMDBToMovie(baseTMDBMovie, credits);

        // Director should be translated
        expect(result.crew[0].job.lo).toBe('ຜູ້ກຳກັບ');
        // Screenplay should be translated
        expect(result.crew[1].job.lo).toBe('ບົດຮູບເງົາ');
      });

      it('should preserve existing Lao crew job translations', () => {
        const existingMovie: Partial<Movie> = {
          crew: [
            {
              person: { id: 10, name: { en: 'Director Name', lo: 'ຜູ້ກຳກັບຊື່' } },
              job: { en: 'Director', lo: 'ຜູ້ກຳກັບພິເສດ' },
              department: 'Directing',
            },
          ],
        };

        const result = mapTMDBToMovie(baseTMDBMovie, credits, undefined, undefined, existingMovie);

        expect(result.crew[0].job.lo).toBe('ຜູ້ກຳກັບພິເສດ');
      });
    });

    describe('Images Mapping', () => {
      const images: TMDBImages = {
        id: 12345,
        posters: [
          { file_path: '/poster1.jpg', aspect_ratio: 0.667, height: 1500, width: 1000, iso_639_1: 'en', vote_average: 5.5, vote_count: 10 },
          { file_path: '/poster2.jpg', aspect_ratio: 0.667, height: 1500, width: 1000, iso_639_1: null, vote_average: 4.0, vote_count: 5 },
        ],
        backdrops: [
          { file_path: '/backdrop1.jpg', aspect_ratio: 1.778, height: 1080, width: 1920, iso_639_1: null, vote_average: 6.0, vote_count: 20 },
        ],
        logos: [
          { file_path: '/logo1.png', aspect_ratio: 2.5, height: 100, width: 250, iso_639_1: 'en', vote_average: 5.0, vote_count: 3 },
        ],
      };

      it('should map all image types', () => {
        const result = mapTMDBToMovie(baseTMDBMovie, undefined, images);

        expect(result.images).toBeDefined();
        expect(result.images!.filter(i => i.type === 'poster')).toHaveLength(2);
        expect(result.images!.filter(i => i.type === 'backdrop')).toHaveLength(1);
        expect(result.images!.filter(i => i.type === 'logo')).toHaveLength(1);
      });

      it('should mark first poster and backdrop as primary', () => {
        const result = mapTMDBToMovie(baseTMDBMovie, undefined, images);

        const posters = result.images!.filter(i => i.type === 'poster');
        expect(posters[0].is_primary).toBe(true);
        expect(posters[1].is_primary).toBe(false);

        const backdrops = result.images!.filter(i => i.type === 'backdrop');
        expect(backdrops[0].is_primary).toBe(true);
      });

      it('should preserve image metadata', () => {
        const result = mapTMDBToMovie(baseTMDBMovie, undefined, images);

        const poster = result.images!.find(i => i.file_path === '/poster1.jpg');
        expect(poster?.aspect_ratio).toBe(0.667);
        expect(poster?.height).toBe(1500);
        expect(poster?.width).toBe(1000);
        expect(poster?.vote_average).toBe(5.5);
        expect(poster?.vote_count).toBe(10);
      });
    });

    describe('Videos/Trailers Mapping', () => {
      const videos: TMDBVideos = {
        id: 12345,
        results: [
          {
            id: 'v1',
            iso_639_1: 'en',
            iso_3166_1: 'US',
            name: 'Official Trailer',
            key: 'abc123',
            site: 'YouTube',
            size: 1080,
            type: 'Trailer',
            official: true,
            published_at: '2024-01-01T00:00:00.000Z',
          },
          {
            id: 'v2',
            iso_639_1: 'en',
            iso_3166_1: 'US',
            name: 'Teaser',
            key: 'def456',
            site: 'YouTube',
            size: 1080,
            type: 'Teaser',
            official: false,
            published_at: '2023-12-01T00:00:00.000Z',
          },
          {
            id: 'v3',
            iso_639_1: 'en',
            iso_3166_1: 'US',
            name: 'Behind the Scenes',
            key: 'ghi789',
            site: 'YouTube',
            size: 1080,
            type: 'Behind the Scenes',
            official: true,
            published_at: '2024-01-15T00:00:00.000Z',
          },
        ],
      };

      it('should filter to only trailers, teasers, and clips', () => {
        const result = mapTMDBToMovie(baseTMDBMovie, undefined, undefined, videos);

        // "Behind the Scenes" should be excluded
        expect(result.trailers).toHaveLength(2);
        expect(result.trailers!.map(t => t.name)).toContain('Official Trailer');
        expect(result.trailers!.map(t => t.name)).toContain('Teaser');
        expect(result.trailers!.map(t => t.name)).not.toContain('Behind the Scenes');
      });

      it('should only include YouTube videos', () => {
        const mixedVideos: TMDBVideos = {
          id: 1,
          results: [
            { ...videos.results[0], site: 'Vimeo' },
            videos.results[1],
          ],
        };

        const result = mapTMDBToMovie(baseTMDBMovie, undefined, undefined, mixedVideos);

        expect(result.trailers).toHaveLength(1);
        const trailer = result.trailers![0] as { key?: string };
        expect(trailer.key).toBe('def456');
      });

      it('should sort official trailers first', () => {
        const result = mapTMDBToMovie(baseTMDBMovie, undefined, undefined, videos);

        expect(result.trailers![0].official).toBe(true);
      });

      it('should map trailer fields correctly', () => {
        const result = mapTMDBToMovie(baseTMDBMovie, undefined, undefined, videos);

        const trailerData = result.trailers![0] as { type: string; key?: string; name: string; language?: string };
        expect(trailerData.type).toBe('youtube');
        expect(trailerData.key).toBe('abc123');
        expect(trailerData.name).toBe('Official Trailer');
        expect(trailerData.language).toBe('en');
      });
    });

    describe('Status Mapping', () => {
      it('should map Released status', () => {
        const result = mapTMDBToMovie({ ...baseTMDBMovie, status: 'Released' });
        expect(result.status).toBe('Released');
      });

      it('should map In Production status', () => {
        const result = mapTMDBToMovie({ ...baseTMDBMovie, status: 'In Production' });
        expect(result.status).toBe('In Production');
      });

      it('should default unknown status to Released', () => {
        const result = mapTMDBToMovie({ ...baseTMDBMovie, status: 'UnknownStatus' });
        expect(result.status).toBe('Released');
      });
    });

    describe('Null/Undefined Handling', () => {
      it('should handle missing optional fields', () => {
        const minimalMovie: TMDBMovieDetails = {
          ...baseTMDBMovie,
          imdb_id: null,
          runtime: null,
          homepage: null,
          budget: 0,
          revenue: 0,
        };

        const result = mapTMDBToMovie(minimalMovie);

        expect(result.imdb_id).toBeUndefined();
        expect(result.runtime).toBeUndefined();
        expect(result.homepage).toBeUndefined();
        expect(result.budget).toBeUndefined();
        expect(result.revenue).toBeUndefined();
      });
    });
  });

  // =============================================================================
  // mapTMDBToPerson TESTS
  // =============================================================================

  describe('mapTMDBToPerson', () => {
    const baseTMDBPerson: TMDBPersonDetails = {
      id: 100,
      name: 'Famous Actor',
      biography: 'A famous actor known for many roles.',
      birthday: '1980-05-15',
      deathday: null,
      place_of_birth: 'Los Angeles, California, USA',
      profile_path: '/actor.jpg',
      known_for_department: 'Acting',
      gender: 2,
      popularity: 85.5,
      imdb_id: 'nm0000001',
      homepage: 'https://actor.example.com',
      also_known_as: ['Actor Alias'],
    };

    it('should map basic person details', () => {
      const result = mapTMDBToPerson(baseTMDBPerson);

      expect(result.id).toBe(100);
      expect(result.name.en).toBe('Famous Actor');
      expect(result.biography?.en).toBe('A famous actor known for many roles.');
      expect(result.birthday).toBe('1980-05-15');
      expect(result.deathday).toBeUndefined();
      expect(result.place_of_birth).toBe('Los Angeles, California, USA');
      expect(result.profile_path).toBe('/actor.jpg');
      expect(result.known_for_department).toBe('Acting');
      expect(result.gender).toBe(2);
      expect(result.popularity).toBe(85.5);
      expect(result.imdb_id).toBe('nm0000001');
      expect(result.homepage).toBe('https://actor.example.com');
    });

    it('should create localized name with empty Lao', () => {
      const result = mapTMDBToPerson(baseTMDBPerson);

      expect(result.name).toEqual({ en: 'Famous Actor', lo: undefined });
    });

    it('should preserve existing Lao name', () => {
      const existingPerson = {
        name: { en: 'Old Name', lo: 'ນັກສະແດງລາວ' },
      };

      const result = mapTMDBToPerson(baseTMDBPerson, existingPerson);

      expect(result.name).toEqual({ en: 'Famous Actor', lo: 'ນັກສະແດງລາວ' });
    });

    it('should preserve existing Lao biography', () => {
      const existingPerson = {
        biography: { en: 'Old bio', lo: 'ປະຫວັດລາວ' },
      };

      const result = mapTMDBToPerson(baseTMDBPerson, existingPerson);

      expect(result.biography).toEqual({ en: 'A famous actor known for many roles.', lo: 'ປະຫວັດລາວ' });
    });

    it('should handle missing biography', () => {
      const personWithoutBio = { ...baseTMDBPerson, biography: '' };
      const result = mapTMDBToPerson(personWithoutBio);

      expect(result.biography).toBeUndefined();
    });

    it('should handle null optional fields', () => {
      const minimalPerson: TMDBPersonDetails = {
        ...baseTMDBPerson,
        birthday: null,
        deathday: null,
        place_of_birth: null,
        profile_path: null,
        imdb_id: null,
        homepage: null,
      };

      const result = mapTMDBToPerson(minimalPerson);

      expect(result.birthday).toBeUndefined();
      expect(result.deathday).toBeUndefined();
      expect(result.place_of_birth).toBeUndefined();
      expect(result.profile_path).toBeUndefined();
      expect(result.imdb_id).toBeUndefined();
      expect(result.homepage).toBeUndefined();
    });
  });

  // =============================================================================
  // getMissingTranslations TESTS
  // =============================================================================

  describe('getMissingTranslations', () => {
    it('should return empty array for fully translated movie', () => {
      const movie: Partial<Movie> = {
        title: { en: 'Title', lo: 'ຊື່' },
        overview: { en: 'Overview', lo: 'ພາບລວມ' },
        tagline: { en: 'Tagline', lo: 'ຄຳຂວັນ' },
      };

      const result = getMissingTranslations(movie);

      expect(result).toEqual([]);
    });

    it('should report missing Lao title', () => {
      const movie: Partial<Movie> = {
        title: { en: 'Title', lo: '' },
        overview: { en: 'Overview', lo: 'ພາບລວມ' },
      };

      const result = getMissingTranslations(movie);

      expect(result).toContain('Title (Lao)');
    });

    it('should report missing Lao overview', () => {
      const movie: Partial<Movie> = {
        title: { en: 'Title', lo: 'ຊື່' },
        overview: { en: 'Overview', lo: '' },
      };

      const result = getMissingTranslations(movie);

      expect(result).toContain('Overview (Lao)');
    });

    it('should report missing Lao tagline only when tagline exists', () => {
      const movieWithTagline: Partial<Movie> = {
        title: { en: 'Title', lo: 'ຊື່' },
        overview: { en: 'Overview', lo: 'ພາບລວມ' },
        tagline: { en: 'Tagline', lo: '' },
      };

      const movieWithoutTagline: Partial<Movie> = {
        title: { en: 'Title', lo: 'ຊື່' },
        overview: { en: 'Overview', lo: 'ພາບລວມ' },
      };

      expect(getMissingTranslations(movieWithTagline)).toContain('Tagline (Lao)');
      expect(getMissingTranslations(movieWithoutTagline)).not.toContain('Tagline (Lao)');
    });

    it('should report all missing translations', () => {
      const movie: Partial<Movie> = {
        title: { en: 'Title', lo: '' },
        overview: { en: 'Overview', lo: '' },
        tagline: { en: 'Tagline', lo: '' },
      };

      const result = getMissingTranslations(movie);

      expect(result).toHaveLength(3);
      expect(result).toContain('Title (Lao)');
      expect(result).toContain('Overview (Lao)');
      expect(result).toContain('Tagline (Lao)');
    });
  });

  // =============================================================================
  // SYNCABLE_FIELDS TESTS
  // =============================================================================

  describe('SYNCABLE_FIELDS', () => {
    it('should include expected fields', () => {
      expect(SYNCABLE_FIELDS).toContain('vote_average');
      expect(SYNCABLE_FIELDS).toContain('vote_count');
      expect(SYNCABLE_FIELDS).toContain('popularity');
      expect(SYNCABLE_FIELDS).toContain('budget');
      expect(SYNCABLE_FIELDS).toContain('revenue');
      expect(SYNCABLE_FIELDS).toContain('runtime');
      expect(SYNCABLE_FIELDS).toContain('status');
      expect(SYNCABLE_FIELDS).toContain('poster_path');
      expect(SYNCABLE_FIELDS).toContain('backdrop_path');
    });

    it('should not include localized text fields', () => {
      expect(SYNCABLE_FIELDS).not.toContain('title');
      expect(SYNCABLE_FIELDS).not.toContain('overview');
      expect(SYNCABLE_FIELDS).not.toContain('tagline');
    });
  });
});
