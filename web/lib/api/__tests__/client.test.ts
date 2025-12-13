/**
 * API Client Tests
 *
 * Tests the main API client that communicates with the backend.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock the auth client to control session token
jest.mock('../../auth/api-client', () => ({
  __esModule: true,
  getRawSessionToken: jest.fn(),
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Import mocked modules
import { getRawSessionToken } from '../../auth/api-client';

// Import the module under test
import {
  APIError,
  movieAPI,
  peopleAPI,
  castCrewAPI,
  movieProductionCompaniesAPI,
  productionCompaniesAPI,
  shortPacksAPI,
} from '../client';

const mockGetRawSessionToken = getRawSessionToken as jest.Mock;

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRawSessionToken.mockReturnValue(null);
  });

  describe('APIError', () => {
    it('should create an error with status and data', () => {
      const error = new APIError('Not found', 404, { details: 'Movie not found' });

      expect(error.message).toBe('Not found');
      expect(error.status).toBe(404);
      expect(error.data).toEqual({ details: 'Movie not found' });
      expect(error.name).toBe('APIError');
    });
  });

  describe('fetchAPI (internal)', () => {
    it('should include auth token when available', async () => {
      mockGetRawSessionToken.mockReturnValue('test-token');
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ movies: [] }),
      });

      await movieAPI.getAll();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should not include auth header when no token', async () => {
      mockGetRawSessionToken.mockReturnValue(null);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ movies: [] }),
      });

      await movieAPI.getAll();

      const callHeaders = mockFetch.mock.calls[0][1].headers;
      expect(callHeaders.Authorization).toBeUndefined();
    });

    it('should throw APIError on non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ error: 'Movie not found' }),
      });

      await expect(movieAPI.getById('invalid-id')).rejects.toThrow(APIError);
      await expect(movieAPI.getById('invalid-id')).rejects.toMatchObject({
        status: 404,
        message: 'Movie not found',
      });
    });

    it('should handle JSON parse errors gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      await expect(movieAPI.getById('id')).rejects.toThrow(APIError);
    });
  });

  describe('movieAPI', () => {
    describe('getAll', () => {
      it('should fetch all movies', async () => {
        const mockMovies = [{ id: '1', title: { en: 'Movie 1' } }];
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ movies: mockMovies }),
        });

        const result = await movieAPI.getAll();

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/movies'),
          expect.any(Object)
        );
        expect(result.movies).toEqual(mockMovies);
      });
    });

    describe('getById', () => {
      it('should fetch movie by ID', async () => {
        const mockMovie = { id: 'movie-123', title: { en: 'Test Movie' } };
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockMovie),
        });

        const result = await movieAPI.getById('movie-123');

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/movies/movie-123'),
          expect.any(Object)
        );
        expect(result).toEqual(mockMovie);
      });
    });

    describe('create', () => {
      it('should create a movie with POST', async () => {
        const movieData = { title: { en: 'New Movie' }, original_title: 'New Movie' };
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ id: 'new-id', ...movieData }),
        });

        await movieAPI.create(movieData);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/movies'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(movieData),
          })
        );
      });
    });

    describe('update', () => {
      it('should update a movie with PUT', async () => {
        const updateData = { title: { en: 'Updated Title' } };
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ id: 'movie-123', ...updateData }),
        });

        await movieAPI.update('movie-123', updateData);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/movies/movie-123'),
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify(updateData),
          })
        );
      });
    });

    describe('delete', () => {
      it('should delete a movie with DELETE', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ message: 'Deleted', id: 'movie-123' }),
        });

        await movieAPI.delete('movie-123');

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/movies/movie-123'),
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });
    });

    describe('setPrimaryImage', () => {
      it('should set primary image for movie', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

        await movieAPI.setPrimaryImage('movie-123', 'image-456', 'poster');

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/movies/movie-123/images/image-456/primary'),
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ type: 'poster' }),
          })
        );
      });
    });
  });

  describe('peopleAPI', () => {
    describe('getAll', () => {
      it('should fetch all people', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ people: [] }),
        });

        await peopleAPI.getAll();

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/people'),
          expect.any(Object)
        );
      });

      it('should include search params', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ people: [] }),
        });

        await peopleAPI.getAll({ search: 'john', limit: 10 });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringMatching(/\/people\?.*search=john/),
          expect.any(Object)
        );
      });
    });

    describe('search', () => {
      it('should search people with query', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ people: [] }),
        });

        await peopleAPI.search('actor name', 15);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringMatching(/\/people\?search=actor%20name&limit=15/),
          expect.any(Object)
        );
      });
    });

    describe('create', () => {
      it('should create a person', async () => {
        const personData = {
          name: { en: 'New Person', lo: 'ຄົນໃໝ່' },
          known_for_department: 'Acting',
        };
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ id: 1, ...personData }),
        });

        await peopleAPI.create(personData);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/people'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(personData),
          })
        );
      });
    });

    describe('merge', () => {
      it('should merge two people', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ success: true, targetId: 2 }),
        });

        await peopleAPI.merge(1, 2);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/people/merge'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ sourceId: 1, targetId: 2 }),
          })
        );
      });
    });

    describe('delete', () => {
      it('should delete a person', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

        await peopleAPI.delete(123);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/people/123'),
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });
    });
  });

  describe('castCrewAPI', () => {
    describe('addCast', () => {
      it('should add cast member to movie', async () => {
        const castData = {
          person_id: 1,
          character: { en: 'Hero', lo: 'ວີລະບຸລຸດ' },
          order: 0,
        };
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ ...castData }),
        });

        await castCrewAPI.addCast('movie-123', castData);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/movies/movie-123/cast'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(castData),
          })
        );
      });
    });

    describe('addCrew', () => {
      it('should add crew member to movie', async () => {
        const crewData = {
          person_id: 2,
          department: 'Directing',
          job: { en: 'Director', lo: 'ຜູ້ກຳກັບ' },
        };
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ ...crewData }),
        });

        await castCrewAPI.addCrew('movie-123', crewData);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/movies/movie-123/crew'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(crewData),
          })
        );
      });
    });

    describe('removeCast', () => {
      it('should remove cast member from movie', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

        await castCrewAPI.removeCast('movie-123', 456);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/movies/movie-123/cast/456'),
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });
    });

    describe('removeCrew', () => {
      it('should remove crew member from movie', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

        await castCrewAPI.removeCrew('movie-123', 456, 'Directing');

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringMatching(/\/movies\/movie-123\/crew\/456\?department=Directing/),
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });
    });
  });

  describe('movieProductionCompaniesAPI', () => {
    describe('add', () => {
      it('should add production company to movie', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

        await movieProductionCompaniesAPI.add('movie-123', { company_id: 1, order: 0 });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/movies/movie-123/production-companies'),
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });

    describe('remove', () => {
      it('should remove production company from movie', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

        await movieProductionCompaniesAPI.remove('movie-123', 456);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/movies/movie-123/production-companies/456'),
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });
    });
  });

  describe('productionCompaniesAPI', () => {
    describe('getAll', () => {
      it('should fetch all production companies', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ companies: [] }),
        });

        await productionCompaniesAPI.getAll();

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/production-companies'),
          expect.any(Object)
        );
      });
    });

    describe('create', () => {
      it('should create a production company', async () => {
        const companyData = { name: { en: 'New Studio', lo: 'ສະຕູດິໂອໃໝ່' } };
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ id: 1, ...companyData }),
        });

        await productionCompaniesAPI.create(companyData);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/production-companies'),
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });
  });

  describe('shortPacksAPI', () => {
    describe('getAll', () => {
      it('should fetch all short packs', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ short_packs: [] }),
        });

        await shortPacksAPI.getAll();

        expect(mockFetch).toHaveBeenCalled();
        expect(mockFetch.mock.calls[0][0]).toContain('/short-packs');
      });

      it('should filter by published status', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ short_packs: [] }),
        });

        await shortPacksAPI.getAll({ published: true });

        expect(mockFetch).toHaveBeenCalled();
        expect(mockFetch.mock.calls[0][0]).toMatch(/short-packs\?published=true/);
      });
    });

    describe('create', () => {
      it('should create a short pack', async () => {
        const packData = {
          title: { en: 'New Pack', lo: 'ແພັກໃໝ່' },
          price_usd: 2.99,
        };
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ id: 'pack-123', ...packData }),
        });

        await shortPacksAPI.create(packData);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/short-packs'),
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });

    describe('addShort', () => {
      it('should add short to pack', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

        await shortPacksAPI.addShort('pack-123', 'movie-456', 0);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/short-packs/pack-123/shorts'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ movie_id: 'movie-456', order: 0 }),
          })
        );
      });
    });

    describe('reorderShorts', () => {
      it('should reorder shorts in pack', async () => {
        const shorts = [
          { movie_id: 'movie-1', order: 0 },
          { movie_id: 'movie-2', order: 1 },
        ];
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

        await shortPacksAPI.reorderShorts('pack-123', shorts);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/short-packs/pack-123/reorder'),
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ shorts }),
          })
        );
      });
    });
  });
});
