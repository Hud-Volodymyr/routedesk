import { z } from 'zod';
import { queryNumber } from '../../common/validation/query.js';

export const MAX_RADIUS_KM = 100;

export const storesWithinQuery = z.strictObject({
  lng: queryNumber.pipe(z.number().min(-180).max(180)),
  lat: queryNumber.pipe(z.number().min(-90).max(90)),
  radiusKm: queryNumber.pipe(z.number().positive().max(MAX_RADIUS_KM)),
});

export type StoresWithinQuery = z.output<typeof storesWithinQuery>;
