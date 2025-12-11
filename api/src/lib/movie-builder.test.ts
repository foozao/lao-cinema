/**
 * Movie Builder Tests
 * 
 * Tests the buildMovieWithRelations helper function.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { buildMovieWithRelations } from './movie-builder.js';

describe('buildMovieWithRelations', () => {
  let testMovieId: string;
  let testPersonId: number;
  let testGenreId: number;

  beforeEach(async () => {
    // Clean up
    await db.delete(schema.movieImages);
    await db.delete(schema.movieGenres);
    await db.delete(schema.movieCastTranslations);
    await db.delete(schema.movieCrewTranslations);
    await db.delete(schema.movieCast);
    await db.delete(schema.movieCrew);
    await db.delete(schema.videoSources);
    await db.delete(schema.movieExternalPlatforms);
    await db.delete(schema.movieProductionCompanies);
    await db.delete(schema.movieTranslations);
    await db.delete(schema.genreTranslations);
    await db.delete(schema.genres);
    await db.delete(schema.peopleTranslations);
    await db.delete(schema.people);
    await db.delete(schema.productionCompanyTranslations);
    await db.delete(schema.productionCompanies);
    
    // Create test person
    const [person] = await db.insert(schema.people).values({
      id: -1000,
      knownForDepartment: 'Acting',
      profilePath: '/profile.jpg',
    }).returning();
    testPersonId = person.id;

    await db.insert(schema.peopleTranslations).values([
      { personId: testPersonId, language: 'en', name: 'Test Actor' },
      { personId: testPersonId, language: 'lo', name: 'ນັກສະແດງທົດສອບ' },
    ]);

    // Create test genre
    const [genre] = await db.insert(schema.genres).values({
      id: 99999,
    }).returning();
    testGenreId = genre.id;

    await db.insert(schema.genreTranslations).values([
      { genreId: testGenreId, language: 'en', name: 'Drama' },
      { genreId: testGenreId, language: 'lo', name: 'ລະຄອນ' },
    ]);

    // Create test movie
    const [movie] = await db.insert(schema.movies).values({
      originalTitle: 'Test Movie',
      originalLanguage: 'en',
      releaseDate: '2024-01-15',
      runtime: 120,
      posterPath: '/poster.jpg',
      backdropPath: '/backdrop.jpg',
      adult: false,
      voteAverage: 8.5,
      voteCount: 100,
    }).returning();
    testMovieId = movie.id;

    // Add translations
    await db.insert(schema.movieTranslations).values([
      { movieId: testMovieId, language: 'en', title: 'Test Movie', overview: 'A test movie overview', tagline: 'Test tagline' },
      { movieId: testMovieId, language: 'lo', title: 'ຮູບເງົາທົດສອບ', overview: 'ພາບລວມຂອງຮູບເງົາທົດສອບ' },
    ]);

    // Add genre
    await db.insert(schema.movieGenres).values({
      movieId: testMovieId,
      genreId: testGenreId,
    });

    // Add cast
    await db.insert(schema.movieCast).values({
      movieId: testMovieId,
      personId: testPersonId,
      order: 0,
    });
    await db.insert(schema.movieCastTranslations).values([
      { movieId: testMovieId, personId: testPersonId, language: 'en', character: 'Main Hero' },
      { movieId: testMovieId, personId: testPersonId, language: 'lo', character: 'ພະເອກຫຼັກ' },
    ]);

    // Add crew
    await db.insert(schema.movieCrew).values({
      movieId: testMovieId,
      personId: testPersonId,
      department: 'Directing',
    });
    await db.insert(schema.movieCrewTranslations).values([
      { movieId: testMovieId, personId: testPersonId, department: 'Directing', language: 'en', job: 'Director' },
    ]);

    // Add video source
    await db.insert(schema.videoSources).values({
      movieId: testMovieId,
      url: 'test-movie-hls',
      format: 'hls',
      quality: '1080p',
      width: 1920,
      height: 1080,
    });

    // Add external platform
    await db.insert(schema.movieExternalPlatforms).values({
      movieId: testMovieId,
      platform: 'netflix',
      url: 'https://netflix.com/test',
    });
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(schema.movieImages);
    await db.delete(schema.movieGenres);
    await db.delete(schema.movieCastTranslations);
    await db.delete(schema.movieCrewTranslations);
    await db.delete(schema.movieCast);
    await db.delete(schema.movieCrew);
    await db.delete(schema.videoSources);
    await db.delete(schema.movieExternalPlatforms);
    await db.delete(schema.movieTranslations);
    await db.delete(schema.movies).where(eq(schema.movies.id, testMovieId));
    await db.delete(schema.genreTranslations);
    await db.delete(schema.genres).where(eq(schema.genres.id, testGenreId));
    await db.delete(schema.peopleTranslations);
    await db.delete(schema.people).where(eq(schema.people.id, testPersonId));
  });

  describe('Basic Movie Fields', () => {
    it('should build movie with basic fields', async () => {
      const [movie] = await db.select().from(schema.movies).where(eq(schema.movies.id, testMovieId));
      
      const result = await buildMovieWithRelations(movie, db, schema, {
        includeCast: false,
        includeCrew: false,
        includeGenres: false,
      });

      expect(result.id).toBe(testMovieId);
      expect(result.original_title).toBe('Test Movie');
      expect(result.runtime).toBe(120);
      expect(result.poster_path).toBe('/poster.jpg');
      expect(result.backdrop_path).toBe('/backdrop.jpg');
      expect(result.vote_average).toBe(8.5);
    });

    it('should include translations', async () => {
      const [movie] = await db.select().from(schema.movies).where(eq(schema.movies.id, testMovieId));
      
      const result = await buildMovieWithRelations(movie, db, schema, {
        includeCast: false,
        includeCrew: false,
        includeGenres: false,
      });

      expect(result.title.en).toBe('Test Movie');
      expect(result.title.lo).toBe('ຮູບເງົາທົດສອບ');
      expect(result.overview.en).toBe('A test movie overview');
      expect(result.overview.lo).toBe('ພາບລວມຂອງຮູບເງົາທົດສອບ');
      expect(result.tagline.en).toBe('Test tagline');
    });
  });

  describe('Video Sources', () => {
    it('should include video sources with formatted URL', async () => {
      const [movie] = await db.select().from(schema.movies).where(eq(schema.movies.id, testMovieId));
      
      const result = await buildMovieWithRelations(movie, db, schema);

      expect(result.video_sources).toHaveLength(1);
      expect(result.video_sources[0].format).toBe('hls');
      expect(result.video_sources[0].quality).toBe('1080p');
      expect(result.video_sources[0].url).toContain('test-movie-hls');
      expect(result.video_sources[0].url).toContain('master.m3u8');
    });
  });

  describe('External Platforms', () => {
    it('should include external platforms', async () => {
      const [movie] = await db.select().from(schema.movies).where(eq(schema.movies.id, testMovieId));
      
      const result = await buildMovieWithRelations(movie, db, schema);

      expect(result.external_platforms).toHaveLength(1);
      expect(result.external_platforms[0].platform).toBe('netflix');
      expect(result.external_platforms[0].url).toBe('https://netflix.com/test');
    });
  });

  describe('Cast', () => {
    it('should include cast when requested', async () => {
      const [movie] = await db.select().from(schema.movies).where(eq(schema.movies.id, testMovieId));
      
      const result = await buildMovieWithRelations(movie, db, schema, {
        includeCast: true,
      });

      expect(result.cast).toHaveLength(1);
      expect(result.cast[0].person.id).toBe(testPersonId);
      expect(result.cast[0].person.name.en).toBe('Test Actor');
      expect(result.cast[0].character.en).toBe('Main Hero');
      expect(result.cast[0].character.lo).toBe('ພະເອກຫຼັກ');
    });

    it('should exclude cast when not requested', async () => {
      const [movie] = await db.select().from(schema.movies).where(eq(schema.movies.id, testMovieId));
      
      const result = await buildMovieWithRelations(movie, db, schema, {
        includeCast: false,
      });

      expect(result.cast).toEqual([]);
    });

    it('should limit cast results', async () => {
      const [movie] = await db.select().from(schema.movies).where(eq(schema.movies.id, testMovieId));
      
      const result = await buildMovieWithRelations(movie, db, schema, {
        includeCast: true,
        castLimit: 1,
      });

      expect(result.cast.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Crew', () => {
    it('should include crew when requested', async () => {
      const [movie] = await db.select().from(schema.movies).where(eq(schema.movies.id, testMovieId));
      
      const result = await buildMovieWithRelations(movie, db, schema, {
        includeCrew: true,
      });

      expect(result.crew).toHaveLength(1);
      expect(result.crew[0].person.id).toBe(testPersonId);
      expect(result.crew[0].job.en).toBe('Director');
      expect(result.crew[0].department).toBe('Directing');
    });

    it('should exclude crew when not requested', async () => {
      const [movie] = await db.select().from(schema.movies).where(eq(schema.movies.id, testMovieId));
      
      const result = await buildMovieWithRelations(movie, db, schema, {
        includeCrew: false,
      });

      expect(result.crew).toEqual([]);
    });
  });

  describe('Genres', () => {
    it('should include genres when requested', async () => {
      const [movie] = await db.select().from(schema.movies).where(eq(schema.movies.id, testMovieId));
      
      const result = await buildMovieWithRelations(movie, db, schema, {
        includeGenres: true,
      });

      expect(result.genres).toHaveLength(1);
      expect(result.genres[0].id).toBe(testGenreId);
      expect(result.genres[0].name.en).toBe('Drama');
      expect(result.genres[0].name.lo).toBe('ລະຄອນ');
    });

    it('should exclude genres when not requested', async () => {
      const [movie] = await db.select().from(schema.movies).where(eq(schema.movies.id, testMovieId));
      
      const result = await buildMovieWithRelations(movie, db, schema, {
        includeGenres: false,
      });

      expect(result.genres).toEqual([]);
    });
  });

  describe('Images', () => {
    it('should include images when requested', async () => {
      // Add image
      await db.insert(schema.movieImages).values({
        movieId: testMovieId,
        type: 'poster',
        filePath: '/image.jpg',
        width: 500,
        height: 750,
        isPrimary: true,
      });

      const [movie] = await db.select().from(schema.movies).where(eq(schema.movies.id, testMovieId));
      
      const result = await buildMovieWithRelations(movie, db, schema, {
        includeImages: true,
      });

      expect(result.images).toHaveLength(1);
      expect(result.images[0].type).toBe('poster');
      expect(result.images[0].file_path).toBe('/image.jpg');
      expect(result.images[0].is_primary).toBe(true);
    });

    it('should exclude images by default', async () => {
      const [movie] = await db.select().from(schema.movies).where(eq(schema.movies.id, testMovieId));
      
      const result = await buildMovieWithRelations(movie, db, schema);

      expect(result.images).toBeUndefined();
    });
  });

  describe('Default Options', () => {
    it('should use default options (cast, crew, genres included)', async () => {
      const [movie] = await db.select().from(schema.movies).where(eq(schema.movies.id, testMovieId));
      
      const result = await buildMovieWithRelations(movie, db, schema);

      // Default includes cast, crew, genres but not images
      expect(result.cast).toBeDefined();
      expect(result.crew).toBeDefined();
      expect(result.genres).toBeDefined();
      expect(result.images).toBeUndefined();
    });

    it('should default cast limit to 3', async () => {
      const [movie] = await db.select().from(schema.movies).where(eq(schema.movies.id, testMovieId));
      
      const result = await buildMovieWithRelations(movie, db, schema);

      // Should have at most 3 cast members by default
      expect(result.cast.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Fallback Values', () => {
    it('should use original_title as fallback for title', async () => {
      // Create movie without translations
      const [emptyMovie] = await db.insert(schema.movies).values({
        originalTitle: 'Untitled Film',
        releaseDate: '2024-01-01',
      }).returning();

      const result = await buildMovieWithRelations(emptyMovie, db, schema, {
        includeCast: false,
        includeCrew: false,
        includeGenres: false,
      });

      expect(result.title.en).toBe('Untitled Film');

      // Clean up
      await db.delete(schema.movies).where(eq(schema.movies.id, emptyMovie.id));
    });
  });

  describe('Production Companies', () => {
    it('should include production companies with translations', async () => {
      // Create production companies
      await db.insert(schema.productionCompanies).values([
        { id: 1, logoPath: '/logo1.png', originCountry: 'LA' },
        { id: 2, logoPath: null, originCountry: 'US' },
      ]);

      await db.insert(schema.productionCompanyTranslations).values([
        { companyId: 1, language: 'en', name: 'Lao Art Media' },
        { companyId: 1, language: 'lo', name: 'ລາວ ອາດ ມີເດຍ' },
        { companyId: 2, language: 'en', name: 'Test Studios' },
      ]);

      // Associate with movie
      await db.insert(schema.movieProductionCompanies).values([
        { movieId: testMovieId, companyId: 1, order: 0 },
        { movieId: testMovieId, companyId: 2, order: 1 },
      ]);

      const [movie] = await db.select().from(schema.movies).where(eq(schema.movies.id, testMovieId));
      
      const result = await buildMovieWithRelations(movie, db, schema);

      expect(result.production_companies).toHaveLength(2);
      expect(result.production_companies[0]).toMatchObject({
        id: 1,
        name: { en: 'Lao Art Media', lo: 'ລາວ ອາດ ມີເດຍ' },
        logo_path: '/logo1.png',
        origin_country: 'LA',
      });
      expect(result.production_companies[1]).toMatchObject({
        id: 2,
        name: { en: 'Test Studios' },
        origin_country: 'US',
      });
    });

    it('should return empty array when no production companies', async () => {
      const [movie] = await db.select().from(schema.movies).where(eq(schema.movies.id, testMovieId));
      
      const result = await buildMovieWithRelations(movie, db, schema);

      expect(result.production_companies).toEqual([]);
    });

    it('should order production companies by order field', async () => {
      // Create production companies
      await db.insert(schema.productionCompanies).values([
        { id: 1 },
        { id: 2 },
        { id: 3 },
      ]);

      await db.insert(schema.productionCompanyTranslations).values([
        { companyId: 1, language: 'en', name: 'Company A' },
        { companyId: 2, language: 'en', name: 'Company B' },
        { companyId: 3, language: 'en', name: 'Company C' },
      ]);

      // Associate with movie in specific order
      await db.insert(schema.movieProductionCompanies).values([
        { movieId: testMovieId, companyId: 3, order: 0 },
        { movieId: testMovieId, companyId: 1, order: 1 },
        { movieId: testMovieId, companyId: 2, order: 2 },
      ]);

      const [movie] = await db.select().from(schema.movies).where(eq(schema.movies.id, testMovieId));
      
      const result = await buildMovieWithRelations(movie, db, schema);

      expect(result.production_companies).toHaveLength(3);
      expect(result.production_companies[0].name.en).toBe('Company C');
      expect(result.production_companies[1].name.en).toBe('Company A');
      expect(result.production_companies[2].name.en).toBe('Company B');
    });
  });
});
