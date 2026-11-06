import { z } from 'zod';
import { queryNumber } from '../../common/validation/query.js';

export const DEFAULT_K = 10;
export const MAX_K = 50;

export const nearestStoresQuery = z.strictObject({
  depotId: z.uuid(),
  k: queryNumber.pipe(z.number().int().min(1).max(MAX_K)).default(DEFAULT_K),
});

export type NearestStoresQuery = z.output<typeof nearestStoresQuery>;
