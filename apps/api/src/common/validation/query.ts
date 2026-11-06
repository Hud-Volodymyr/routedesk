import { z } from 'zod';

export const queryNumber = z.string().trim().min(1).transform(Number);
