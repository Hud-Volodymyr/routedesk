import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tenantContext } from '../common/db/tenant-context.js';
import type { TenantRequest } from './tenant-request.js';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const { tenantId } = context.switchToHttp().getRequest<TenantRequest>();
    if (!tenantId) {
      return next.handle();
    }
    return new Observable((subscriber) =>
      tenantContext.run(tenantId, () => next.handle().subscribe(subscriber)),
    );
  }
}
