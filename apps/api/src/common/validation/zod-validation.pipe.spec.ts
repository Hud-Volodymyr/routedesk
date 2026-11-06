import { HttpException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe.js';

function thrownBy(run: () => unknown): HttpException {
  try {
    run();
  } catch (error) {
    if (error instanceof HttpException) {
      return error;
    }
    throw error;
  }
  throw new Error('expected the pipe to throw');
}

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(
    z.strictObject({
      count: z
        .string()
        .regex(/^\d+$/)
        .transform((value) => Number(value)),
      label: z.string().default('none'),
      filter: z.strictObject({ tag: z.string() }).optional(),
    }),
  );

  it('VALID-1: passes valid input on converted, with defaults applied', () => {
    expect(pipe.transform({ count: '7' })).toEqual({ count: 7, label: 'none' });
  });

  it('VALID-1: rejects invalid input with 400 and a body listing each problem by dot-joined path', () => {
    const error = thrownBy(() =>
      pipe.transform({ count: 'seven', filter: { tag: 8 } }),
    );

    expect(error.getStatus()).toBe(400);
    const body = error.getResponse() as { issues: { path: string }[] };
    body.issues.sort((a, b) => a.path.localeCompare(b.path));

    expect(body).toEqual({
      message: 'Validation failed',
      issues: [
        { path: 'count', message: expect.any(String) },
        { path: 'filter.tag', message: expect.any(String) },
      ],
    });
  });
});
