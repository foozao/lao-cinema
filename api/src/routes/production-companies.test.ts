import { describe, it, expect, beforeEach } from 'vitest';
import { build, createTestEditor } from '../test/app.js';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';

describe('Production Companies Routes', () => {
  beforeEach(async () => {
    // Clean up test data
    await db.delete(schema.movieProductionCompanies);
    await db.delete(schema.productionCompanyTranslations);
    await db.delete(schema.productionCompanies);
  });

  describe('GET /api/production-companies', () => {
    it('should return empty array when no companies exist', async () => {
      const app = await build({ includeProductionCompanies: true });
      const response = await app.inject({
        method: 'GET',
        url: '/api/production-companies',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.companies).toEqual([]);
    });

    it('should return all production companies with translations', async () => {
      const app = await build({ includeProductionCompanies: true });

      // Create test companies
      await db.insert(schema.productionCompanies).values([
        { id: 1, logoPath: '/logo1.png', originCountry: 'LA' },
        { id: 2, logoPath: null, originCountry: 'US' },
      ]);

      await db.insert(schema.productionCompanyTranslations).values([
        { companyId: 1, language: 'en', name: 'Lao Art Media' },
        { companyId: 1, language: 'lo', name: 'ລາວ ອາດ ມີເດຍ' },
        { companyId: 2, language: 'en', name: 'Test Studios' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/production-companies',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.companies).toHaveLength(2);
      expect(body.companies[0]).toMatchObject({
        id: 1,
        name: { en: 'Lao Art Media', lo: 'ລາວ ອາດ ມີເດຍ' },
        logo_path: '/logo1.png',
        origin_country: 'LA',
      });
      expect(body.companies[1]).toMatchObject({
        id: 2,
        name: { en: 'Test Studios' },
        origin_country: 'US',
      });
    });

    it('should filter by search query', async () => {
      const app = await build({ includeProductionCompanies: true });

      await db.insert(schema.productionCompanies).values([
        { id: 1, originCountry: 'LA' },
        { id: 2, originCountry: 'US' },
      ]);

      await db.insert(schema.productionCompanyTranslations).values([
        { companyId: 1, language: 'en', name: 'Lao Art Media' },
        { companyId: 2, language: 'en', name: 'Hollywood Studios' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/production-companies?search=lao',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.companies).toHaveLength(1);
      expect(body.companies[0].name.en).toBe('Lao Art Media');
    });

    it('should limit results', async () => {
      const app = await build({ includeProductionCompanies: true });

      await db.insert(schema.productionCompanies).values([
        { id: 1 }, { id: 2 }, { id: 3 },
      ]);

      await db.insert(schema.productionCompanyTranslations).values([
        { companyId: 1, language: 'en', name: 'Company 1' },
        { companyId: 2, language: 'en', name: 'Company 2' },
        { companyId: 3, language: 'en', name: 'Company 3' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/production-companies?limit=2',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.companies).toHaveLength(2);
    });
  });

  describe('GET /api/production-companies/:id', () => {
    it('should return a single production company', async () => {
      const app = await build({ includeProductionCompanies: true });

      await db.insert(schema.productionCompanies).values({
        id: 1,
        logoPath: '/logo.png',
        originCountry: 'LA',
      });

      await db.insert(schema.productionCompanyTranslations).values([
        { companyId: 1, language: 'en', name: 'Lao Art Media' },
        { companyId: 1, language: 'lo', name: 'ລາວ ອາດ ມີເດຍ' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/production-companies/1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        id: 1,
        name: { en: 'Lao Art Media', lo: 'ລາວ ອາດ ມີເດຍ' },
        logo_path: '/logo.png',
        origin_country: 'LA',
      });
    });

    it('should return 404 for non-existent company', async () => {
      const app = await build({ includeProductionCompanies: true });

      const response = await app.inject({
        method: 'GET',
        url: '/api/production-companies/999',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/production-companies', () => {
    it('should create a new production company with bilingual name', async () => {
      const app = await build({ includeProductionCompanies: true, includeAuth: true });
      const { headers } = await createTestEditor();

      const response = await app.inject({
        method: 'POST',
        url: '/api/production-companies',
        headers,
        payload: {
          name: { en: 'New Studio', lo: 'ສະຕູດິໂອໃໝ່' },
          origin_country: 'LA',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.id).toBeDefined();
      expect(body.name).toEqual({ en: 'New Studio', lo: 'ສະຕູດິໂອໃໝ່' });
      expect(body.origin_country).toBe('LA');

      // Verify in database
      const companies = await db.select()
        .from(schema.productionCompanies)
        .where(eq(schema.productionCompanies.id, body.id));
      expect(companies).toHaveLength(1);
    });

    it('should create a company with only English name', async () => {
      const app = await build({ includeProductionCompanies: true, includeAuth: true });
      const { headers } = await createTestEditor();

      const response = await app.inject({
        method: 'POST',
        url: '/api/production-companies',
        headers,
        payload: {
          name: { en: 'English Only Studio' },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.name).toEqual({ en: 'English Only Studio' });
    });

    it('should reject request without English name', async () => {
      const app = await build({ includeProductionCompanies: true, includeAuth: true });
      const { headers } = await createTestEditor();

      const response = await app.inject({
        method: 'POST',
        url: '/api/production-companies',
        headers,
        payload: {
          name: { lo: 'ລາວເທົ່ານັ້ນ' },
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('PATCH /api/production-companies/:id', () => {
    it('should update a production company', async () => {
      const app = await build({ includeProductionCompanies: true, includeAuth: true });
      const { headers } = await createTestEditor();

      await db.insert(schema.productionCompanies).values({
        id: 1,
        originCountry: 'LA',
      });

      await db.insert(schema.productionCompanyTranslations).values({
        companyId: 1,
        language: 'en',
        name: 'Old Name',
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/production-companies/1',
        headers,
        payload: {
          name: { en: 'Updated Name', lo: 'ຊື່ອັບເດດ' },
          origin_country: 'US',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.name).toEqual({ en: 'Updated Name', lo: 'ຊື່ອັບເດດ' });
      expect(body.origin_country).toBe('US');
    });

    it('should return 404 for non-existent company', async () => {
      const app = await build({ includeProductionCompanies: true, includeAuth: true });
      const { headers } = await createTestEditor();

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/production-companies/999',
        headers,
        payload: {
          name: { en: 'Test' },
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/production-companies/:id', () => {
    it('should delete a production company', async () => {
      const app = await build({ includeProductionCompanies: true, includeAuth: true });
      const { headers } = await createTestEditor();

      await db.insert(schema.productionCompanies).values({ id: 1 });
      await db.insert(schema.productionCompanyTranslations).values({
        companyId: 1,
        language: 'en',
        name: 'To Delete',
      });

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/production-companies/1',
        headers,
      });

      expect(response.statusCode).toBe(200);

      // Verify deletion
      const companies = await db.select()
        .from(schema.productionCompanies)
        .where(eq(schema.productionCompanies.id, 1));
      expect(companies).toHaveLength(0);
    });

    it('should return 404 for non-existent company', async () => {
      const app = await build({ includeProductionCompanies: true, includeAuth: true });
      const { headers } = await createTestEditor();

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/production-companies/999',
        headers,
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
