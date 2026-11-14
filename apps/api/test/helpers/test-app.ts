import { MikroORM } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types.js';
import { AppModule } from '../../src/app.module.js';
import { AccessTokenVerifier } from '../../src/auth/access-token-verifier.js';
import { CognitoUsers } from '../../src/users/cognito-users.js';
import { FakeCognitoUsers } from './fake-cognito-users.js';
import { FakeAccessTokenVerifier } from './tenant.js';
import type { TestDatabase } from './test-database.js';

export async function createTestApp(
  db: TestDatabase,
  cognito: FakeCognitoUsers = new FakeCognitoUsers(),
): Promise<INestApplication<App>> {
  const moduleFixture = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MikroORM)
    .useValue(db.orm)
    .overrideProvider(AccessTokenVerifier)
    .useValue(new FakeAccessTokenVerifier())
    .overrideProvider(CognitoUsers)
    .useValue(cognito)
    .compile();

  if (moduleFixture.get(EntityManager) !== db.orm.em) {
    throw new Error('AppModule is not using the test database ORM');
  }

  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  await app.init();
  return app;
}
