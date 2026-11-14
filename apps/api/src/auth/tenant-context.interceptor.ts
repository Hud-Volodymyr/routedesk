import { RequestContext } from '@mikro-orm/core';
import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import type { TenantRequest } from './tenant-request.js';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const { tenantId } = context.switchToHttp().getRequest<TenantRequest>();
    if (tenantId) {
      RequestContext.getEntityManager()?.setSessionContext({
        variables: { 'app.tenant_id': tenantId },
      });
    }
    return next.handle();
  }
}
