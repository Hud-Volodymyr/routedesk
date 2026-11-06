import { randomUUID } from 'node:crypto';
import { nearestStoresQuery } from './nearest-stores.query.js';

const depotId = randomUUID();

function accepts(query: Record<string, unknown>): boolean {
  return nearestStoresQuery.safeParse(query).success;
}

describe('nearestStoresQuery', () => {
  it('VALID-4: defaults k to 10 when it is missing', () => {
    expect(nearestStoresQuery.parse({ depotId })).toEqual({ depotId, k: 10 });
  });

  it.each([
    ['1', 1],
    ['50', 50],
  ])('VALID-3: converts k=%s to a number at the boundary', (k, expected) => {
    expect(nearestStoresQuery.parse({ depotId, k })).toEqual({
      depotId,
      k: expected,
    });
  });

  it.each(['', 'abc'])('VALID-3: rejects k=%j', (k) => {
    expect(accepts({ depotId, k })).toBe(false);
  });

  it.each(['0', '51', '1.5'])('VALID-4: rejects k=%s', (k) => {
    expect(accepts({ depotId, k })).toBe(false);
  });

  it('VALID-4: requires depotId', () => {
    expect(accepts({ k: '5' })).toBe(false);
  });

  it('VALID-4: rejects a depotId that is not a UUID', () => {
    expect(accepts({ depotId: 'kyiv' })).toBe(false);
  });

  it('VALID-2: rejects the unknown parameter tenantId', () => {
    expect(accepts({ depotId, tenantId: randomUUID() })).toBe(false);
  });
});
