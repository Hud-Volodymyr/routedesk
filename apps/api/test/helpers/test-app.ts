import { MikroORM } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types.js';
import { AppModule } from '../../src/app.module.js';
import type { TestDatabase } from './test-database.js';

export async function createTestApp(db: TestDatabase): Promise<INestApplication<App>> {
  const moduleFixture = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MikroORM)
    .useValue(db.orm)
    .compile();

  if (moduleFixture.get(EntityManager) !== db.orm.em) {
    throw new Error('AppModule is not using the test database ORM');
  }

  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  await app.init();
  return app;
}
