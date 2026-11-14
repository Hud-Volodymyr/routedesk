import { randomUUID } from 'node:crypto';
import { MikroORM, RequestContext } from '@mikro-orm/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import type { INestApplicationContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import config from '../../src/mikro-orm.config.js';
import { CognitoUsers } from '../../src/users/cognito-users.js';
import { User } from '../../src/users/user.entity.js';
import { UsersModule } from '../../src/users/users.module.js';
import { UsersService } from '../../src/users/users.service.js';
import { FakeCognitoUsers } from '../helpers/fake-cognito-users.js';
import {
  startTestDatabase,
  type TestDatabase,
} from '../helpers/test-database.js';

const KYIV_ID = 'a1000000-0000-4000-8000-000000000001';
const LVIV_ID = 'a1000000-0000-4000-8000-000000000002';

describe('create-admin (integration)', () => {
  let db: TestDatabase;
  let moduleRef: INestApplicationContext;
  let service: UsersService;
  let cognito: FakeCognitoUsers;

  beforeAll(async () => {
    db = await startTestDatabase();
    cognito = new FakeCognitoUsers();
    moduleRef = await Test.createTestingModule({
      imports: [MikroOrmModule.forRoot(config), UsersModule],
    })
      .overrideProvider(MikroORM)
      .useValue(db.orm)
      .overrideProvider(CognitoUsers)
      .useValue(cognito)
      .compile();
    service = moduleRef.get(UsersService);
  }, 120_000);

  afterAll(async () => {
    await moduleRef?.close();
    await db?.stop();
  });

  function newEmail(label: string): string {
    return `${label}-${randomUUID()}@example.com`;
  }

  function ensureAdmin(tenantId: string, email: string, name: string) {
    return RequestContext.create(db.orm.em, async () => {
      RequestContext.getEntityManager()!.setSessionContext({
        variables: { 'app.tenant_id': tenantId },
      });
      return service.ensureAdmin(tenantId, email, name);
    });
  }

  function usersWithEmail(email: string) {
    return db.ownerOrm.em
      .fork()
      .find(User, { email }, { populate: ['tenant'] });
  }

  function rowsOf(users: User[]) {
    return users.map((u) => ({
      tenantId: u.tenant.id,
      cognitoSub: u.cognitoSub,
      email: u.email,
      name: u.name,
    }));
  }

  it('USER-5: creates an invited Cognito admin of the tenant and its users row', async () => {
    const email = newEmail('admin');

    await ensureAdmin(LVIV_ID, email, 'Olena');

    const record = cognito.users.get(email);
    expect(record).toEqual({
      email,
      sub: expect.any(String),
      tenantId: LVIV_ID,
      groups: ['admin'],
      signedIn: false,
      invitations: 1,
    });
    expect(rowsOf(await usersWithEmail(email))).toEqual([
      { tenantId: LVIV_ID, cognitoSub: record!.sub, email, name: 'Olena' },
    ]);
  });

  it('USER-5: running again, also after the users row was deleted, restores the row without a second user, group or invitation', async () => {
    const email = newEmail('rerun');
    await ensureAdmin(LVIV_ID, email, 'Ivan');
    const sub = cognito.users.get(email)!.sub;
    const expectedCognito = {
      email,
      sub,
      tenantId: LVIV_ID,
      groups: ['admin'],
      signedIn: false,
      invitations: 1,
    };
    const expectedRows = [
      { tenantId: LVIV_ID, cognitoSub: sub, email, name: 'Ivan' },
    ];

    await ensureAdmin(LVIV_ID, email, 'Ivan');

    expect(cognito.users.get(email)).toEqual(expectedCognito);
    expect(rowsOf(await usersWithEmail(email))).toEqual(expectedRows);

    await db.ownerOrm.em.fork().nativeDelete(User, { email });
    await ensureAdmin(LVIV_ID, email, 'Ivan');

    expect(cognito.users.get(email)).toEqual(expectedCognito);
    expect(rowsOf(await usersWithEmail(email))).toEqual(expectedRows);
  });

  it('USER-5: adds the admin group to an existing Cognito user of the tenant without inviting them', async () => {
    const email = newEmail('promoted');
    const existing = cognito.add({
      email,
      tenantId: LVIV_ID,
      groups: ['dispatcher'],
      signedIn: false,
      invitations: 0,
    });

    await ensureAdmin(LVIV_ID, email, 'Marta');

    expect(cognito.users.get(email)).toEqual({
      email,
      sub: existing.sub,
      tenantId: LVIV_ID,
      groups: ['dispatcher', 'admin'],
      signedIn: false,
      invitations: 0,
    });
    expect(rowsOf(await usersWithEmail(email))).toEqual([
      { tenantId: LVIV_ID, cognitoSub: existing.sub, email, name: 'Marta' },
    ]);
  });

  it('USER-5: rejects an unknown tenant without creating anything', async () => {
    const email = newEmail('unknown-tenant');

    await expect(ensureAdmin(randomUUID(), email, 'Nobody')).rejects.toThrow();

    expect(cognito.users.has(email)).toBe(false);
    expect(await usersWithEmail(email)).toEqual([]);
  });

  it('USER-5: rejects an email of another tenant without changing that user', async () => {
    const email = newEmail('kyiv-user');
    const existing = cognito.add({
      email,
      tenantId: KYIV_ID,
      groups: ['dispatcher'],
      signedIn: false,
      invitations: 0,
    });

    await expect(ensureAdmin(LVIV_ID, email, 'Intruder')).rejects.toThrow();

    expect(cognito.users.get(email)).toEqual({
      email,
      sub: existing.sub,
      tenantId: KYIV_ID,
      groups: ['dispatcher'],
      signedIn: false,
      invitations: 0,
    });
    expect(await usersWithEmail(email)).toEqual([]);
  });
});
