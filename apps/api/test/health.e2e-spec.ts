import type { INestApplication } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing";
import request from 'supertest';
import type { App } from "supertest/types.js"
import { HealthModule } from "../src/health/health.module.js";


describe('HealthController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [HealthModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' })
  });

  afterAll(async () => {
    await app.close();
  });
})
