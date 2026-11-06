import { NotFoundError } from '@mikro-orm/core';
import {
  Catch,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch(NotFoundError)
export class NotFoundErrorFilter implements ExceptionFilter {
  catch(_error: NotFoundError, host: ArgumentsHost): void {
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(HttpStatus.NOT_FOUND)
      .json({ statusCode: HttpStatus.NOT_FOUND, message: 'Not Found' });
  }
}
