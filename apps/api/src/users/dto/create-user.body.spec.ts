import { createUserBody } from './create-user.body.js';

const email = 'olena@example.com';
const name = 'Olena';

function accepts(body: Record<string, unknown>): boolean {
  return createUserBody.safeParse(body).success;
}

describe('createUserBody', () => {
  it.each([
    { email, name, role: 'admin' },
    { email, name, role: 'dispatcher' },
    { email, name, role: 'driver', phone: '+380441234567' },
  ])('USER-4: accepts the role $role', (body) => {
    expect(accepts(body)).toBe(true);
  });

  it('USER-4: rejects an email that is not an email', () => {
    expect(accepts({ email: 'olena', name, role: 'admin' })).toBe(false);
  });

  it('USER-4: rejects an empty name', () => {
    expect(accepts({ email, name: '', role: 'admin' })).toBe(false);
  });

  it('USER-4: rejects a role outside the three roles', () => {
    expect(accepts({ email, name, role: 'manager' })).toBe(false);
  });

  it('USER-4: requires phone for a driver', () => {
    expect(accepts({ email, name, role: 'driver' })).toBe(false);
  });

  it.each(['admin', 'dispatcher'])(
    'USER-4: rejects phone for the role %s',
    (role) => {
      expect(accepts({ email, name, role, phone: '+380441234567' })).toBe(
        false,
      );
    },
  );

  it.each([
    { role: 'admin' },
    { role: 'dispatcher' },
    { role: 'driver', phone: '+380441234567' },
  ])(
    'USER-4: rejects the unknown field tenantId for the role $role',
    (fields) => {
      expect(
        accepts({
          email,
          name,
          ...fields,
          tenantId: '6f1c2a5e-0b7d-4f3a-9a52-3c8e1d2b4f60',
        }),
      ).toBe(false);
    },
  );
});
