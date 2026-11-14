import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { Driver } from '../../src/drivers/driver.entity.js';
import { Tenant } from '../../src/tenants/tenant.entity.js';
import { User } from '../../src/users/user.entity.js';
import { FakeCognitoUsers } from '../helpers/fake-cognito-users.js';
import { createTestApp } from '../helpers/test-app.js';
import {
  startTestDatabase,
  type TestDatabase,
} from '../helpers/test-database.js';
import { authHeader } from '../helpers/tenant.js';

type Step = 'create' | 'addToGroup' | 'sendInvitation';

describe('Users (e2e)', () => {
  let db: TestDatabase;
  let app: INestApplication<App>;
  let cognito: FakeCognitoUsers;
  let kyivId: string;
  let lvivId: string;

  beforeAll(async () => {
    db = await startTestDatabase();
    cognito = new FakeCognitoUsers();
    app = await createTestApp(db, cognito);

    const em = db.ownerOrm.em.fork();
    kyivId = (await em.findOneOrFail(Tenant, { name: 'Kyiv Distribution' })).id;
    lvivId = (await em.findOneOrFail(Tenant, { name: 'Lviv Supply' })).id;
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  function newEmail(label: string): string {
    return `${label}-${randomUUID()}@example.com`;
  }

  function post(tenantId: string, body: Record<string, unknown>) {
    return request(app.getHttpServer())
      .post('/users')
      .set(authHeader(tenantId, ['admin']))
      .send(body);
  }

  function usersWithEmail(email: string) {
    return db.ownerOrm.em
      .fork()
      .find(User, { email }, { populate: ['tenant'] });
  }

  function driversOf(userId: string) {
    return db.ownerOrm.em
      .fork()
      .find(Driver, { user: userId }, { populate: ['tenant'] });
  }

  describe('POST /users', () => {
    it('USER-1: creates a dispatcher in the caller tenant and invites them', async () => {
      const email = newEmail('dispatcher');

      const response = await post(lvivId, {
        email,
        name: 'Taras',
        role: 'dispatcher',
      });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: expect.any(String),
        email,
        name: 'Taras',
        role: 'dispatcher',
      });
      expect(cognito.users.get(email)).toEqual({
        email,
        sub: expect.any(String),
        tenantId: lvivId,
        groups: ['dispatcher'],
        signedIn: false,
        invitations: 1,
      });
      const rows = await usersWithEmail(email);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        id: response.body.id,
        cognitoSub: cognito.users.get(email)?.sub,
        email,
        name: 'Taras',
      });
      expect(rows[0]?.tenant.id).toBe(lvivId);
      expect(await driversOf(response.body.id)).toEqual([]);
    });

    it('USER-1: a driver also gets a drivers row with the phone', async () => {
      const email = newEmail('driver');

      const response = await post(kyivId, {
        email,
        name: 'Oksana',
        role: 'driver',
        phone: '+380501112233',
      });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: expect.any(String),
        email,
        name: 'Oksana',
        role: 'driver',
      });
      expect(cognito.users.get(email)).toMatchObject({
        tenantId: kyivId,
        groups: ['driver'],
        invitations: 1,
      });
      const drivers = await driversOf(response.body.id);
      expect(drivers).toHaveLength(1);
      expect(drivers[0]?.phone).toBe('+380501112233');
      expect(drivers[0]?.tenant.id).toBe(kyivId);
    });

    it.each<[Step, string]>([
      ['create', 'dispatcher'],
      ['addToGroup', 'driver'],
      ['sendInvitation', 'driver'],
    ])(
      'USER-2: a failed %s leaves the user unusable and a retry completes it',
      async (step, role) => {
        const email = newEmail(`retry-${step}`);
        const body =
          role === 'driver'
            ? { email, name: 'Petro', role, phone: '+380671234567' }
            : { email, name: 'Petro', role };

        cognito.failOnce(step);
        const failed = await post(kyivId, body);

        expect(failed.status).toBeGreaterThanOrEqual(400);
        const afterFailure = cognito.users.get(email);
        const rowsAfterFailure = await usersWithEmail(email);
        if (step === 'sendInvitation') {
          expect(afterFailure).toMatchObject({
            groups: [role],
            invitations: 0,
          });
          expect(rowsAfterFailure).toHaveLength(1);
        } else {
          expect(afterFailure?.groups ?? []).toEqual([]);
          expect(afterFailure?.invitations ?? 0).toBe(0);
        }

        const retried = await post(kyivId, body);

        expect(retried.status).toBe(201);
        expect(retried.body).toEqual({
          id: expect.any(String),
          email,
          name: 'Petro',
          role,
        });
        expect(cognito.users.get(email)).toMatchObject({
          tenantId: kyivId,
          groups: [role],
          invitations: 1,
        });
        const rows = await usersWithEmail(email);
        expect(rows).toHaveLength(1);
        expect(rows[0]?.id).toBe(retried.body.id);
        expect(rows[0]?.cognitoSub).toBe(cognito.users.get(email)?.sub);
        expect(await driversOf(retried.body.id)).toHaveLength(
          role === 'driver' ? 1 : 0,
        );
      },
    );

    it('USER-2: a failed database step leaves the user without a group and a retry completes it', async () => {
      const tenantId = randomUUID();
      const email = newEmail('retry-database');
      const body = {
        email,
        name: 'Iryna',
        role: 'driver',
        phone: '+380931234567',
      };

      const failed = await post(tenantId, body);

      expect(failed.status).toBeGreaterThanOrEqual(400);
      expect(cognito.users.get(email)?.groups ?? []).toEqual([]);
      expect(cognito.users.get(email)?.invitations ?? 0).toBe(0);
      expect(await usersWithEmail(email)).toEqual([]);

      const em = db.ownerOrm.em.fork();
      em.create(Tenant, { id: tenantId, name: 'E2E late tenant' });
      await em.flush();

      const retried = await post(tenantId, body);

      expect(retried.status).toBe(201);
      expect(cognito.users.get(email)).toMatchObject({
        tenantId,
        groups: ['driver'],
        invitations: 1,
      });
      const rows = await usersWithEmail(email);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.id).toBe(retried.body.id);
      expect(await driversOf(retried.body.id)).toHaveLength(1);
    });

    it('USER-3: an email of another tenant, a signed-in user or another group is 409 with one body and changes nothing', async () => {
      const cases = [
        {
          label: 'other tenant',
          tenantId: lvivId,
          groups: ['dispatcher'],
          signedIn: false,
          invitations: 1,
        },
        {
          label: 'signed in',
          tenantId: kyivId,
          groups: ['dispatcher'],
          signedIn: true,
          invitations: 1,
        },
        {
          label: 'other group',
          tenantId: kyivId,
          groups: ['driver'],
          signedIn: false,
          invitations: 0,
        },
      ];
      const bodies: unknown[] = [];

      for (const { label, ...record } of cases) {
        const email = newEmail(label.replace(' ', '-'));
        const seeded = cognito.add({ email, ...record });
        const before = structuredClone(seeded);

        const response = await post(kyivId, {
          email,
          name: 'Mykola',
          role: 'dispatcher',
        });

        expect(response.status, label).toBe(409);
        expect(cognito.users.get(email), label).toEqual(before);
        expect(await usersWithEmail(email), label).toEqual([]);
        bodies.push(response.body);
      }

      expect(bodies[1]).toEqual(bodies[0]);
      expect(bodies[2]).toEqual(bodies[0]);
    });

    it.each(['dispatcher', 'driver'])(
      'ROLE-3: a %s token is 403 for a valid body and creates nothing',
      async (group) => {
        const email = newEmail(`role-${group}`);

        const response = await request(app.getHttpServer())
          .post('/users')
          .set(authHeader(kyivId, [group]))
          .send({ email, name: 'Bohdan', role: 'dispatcher' });

        expect(response.status).toBe(403);
        expect(cognito.users.has(email)).toBe(false);
        expect(await usersWithEmail(email)).toEqual([]);
      },
    );

    it('USER-4: an invalid body is 400 in the validation shape', async () => {
      const response = await post(kyivId, {
        email: 'not-an-email',
        name: 'Halyna',
        role: 'admin',
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: 'Validation failed',
        issues: [{ path: 'email', message: expect.any(String) }],
      });
    });
  });
});
