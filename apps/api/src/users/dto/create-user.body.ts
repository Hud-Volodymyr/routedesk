import { z } from 'zod';

const base = {
  email: z.email(),
  name: z.string().trim().min(1),
};

export const createUserBody = z.discriminatedUnion('role', [
  z.strictObject({ ...base, role: z.literal('admin') }),
  z.strictObject({ ...base, role: z.literal('dispatcher') }),
  z.strictObject({
    ...base,
    role: z.literal('driver'),
    phone: z.string().trim().min(1),
  }),
]);

export type CreateUserBody = z.output<typeof createUserBody>;

export interface CreatedUser {
  id: string;
  email: string;
  name: string;
  role: CreateUserBody['role'];
}
