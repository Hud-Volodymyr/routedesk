import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from '../helpers/test-app.js';
import {
  startTestDatabase,
  type TestDatabase,
} from '../helpers/test-database.js';

describe('Health (e2e)', () => {
  let db: TestDatabase;
  let app: INestApplication<App>;

  beforeAll(async () => {
    db = await startTestDatabase();
    app = await createTestApp(db);
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it('HEALTH-1: GET /health returns 200 with status ok, without X-Tenant-Id', async () => {
    const response = await request(app.getHttpServer()).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
