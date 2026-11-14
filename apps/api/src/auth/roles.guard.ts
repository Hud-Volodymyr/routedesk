import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import { ROLES_KEY, type Role } from './roles.decorator.js';
import type { TenantRequest } from './tenant-request.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (
      this.reflector.getAllAndOverride<boolean | undefined>(
        IS_PUBLIC_KEY,
        targets,
      )
    ) {
      return true;
    }

    const allowed = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      targets,
    );
    const groups =
      context.switchToHttp().getRequest<TenantRequest>().user?.groups ?? [];

    if (!allowed?.some((role) => groups.includes(role))) {
      throw new ForbiddenException();
    }
    return true;
  }
}
