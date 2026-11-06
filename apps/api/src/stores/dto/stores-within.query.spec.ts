import { storesWithinQuery } from './stores-within.query.js';

const valid = { lng: '30.6', lat: '50.6', radiusKm: '2' };

function accepts(query: Record<string, unknown>): boolean {
  return storesWithinQuery.safeParse(query).success;
}

describe('storesWithinQuery', () => {
  it('VALID-3: converts numeric strings to numbers', () => {
    expect(
      storesWithinQuery.parse({ lng: '-30.25', lat: '50.6', radiusKm: '0.5' }),
    ).toEqual({ lng: -30.25, lat: 50.6, radiusKm: 0.5 });
  });

  it.each([
    ['lng', ''],
    ['lat', ''],
    ['lng', 'abc'],
    ['radiusKm', '2km'],
  ])('VALID-3: rejects %s=%j', (field, value) => {
    expect(accepts({ ...valid, [field]: value })).toBe(false);
  });

  it.each([
    ['lng', '-180'],
    ['lng', '180'],
    ['lat', '-90'],
    ['lat', '90'],
    ['radiusKm', '0.001'],
    ['radiusKm', '100'],
  ])('VALID-4: accepts the boundary %s=%s', (field, value) => {
    expect(accepts({ ...valid, [field]: value })).toBe(true);
  });

  it.each([
    ['lng', '-180.0001'],
    ['lng', '180.0001'],
    ['lat', '-90.0001'],
    ['lat', '90.0001'],
    ['radiusKm', '0'],
    ['radiusKm', '100.0001'],
  ])('VALID-4: rejects the out-of-range %s=%s', (field, value) => {
    expect(accepts({ ...valid, [field]: value })).toBe(false);
  });

  it.each(['lng', 'lat', 'radiusKm'])('VALID-4: requires %s', (field) => {
    const query: Record<string, string> = { ...valid };
    delete query[field];

    expect(accepts(query)).toBe(false);
  });

  it('VALID-2: rejects the unknown parameter tenantId', () => {
    expect(
      accepts({ ...valid, tenantId: '6f1c2b0a-3d4e-4f5a-8b6c-7d8e9f0a1b2c' }),
    ).toBe(false);
  });
});
