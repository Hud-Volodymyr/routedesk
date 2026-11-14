import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { CognitoAccessTokenPayload } from 'aws-jwt-verify/jwt-model';
import { AccessTokenVerifier } from './access-token-verifier.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import type { TenantRequest } from './tenant-request.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BEARER = /^Bearer (\S+)$/i;

@Injectable()
export class CognitoGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly verifier: AccessTokenVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<TenantRequest>();
    const token = BEARER.exec(request.header('authorization') ?? '')?.[1];
    if (!token) {
      throw new UnauthorizedException();
    }

    let payload: CognitoAccessTokenPayload;
    try {
      payload = await this.verifier.verify(token);
    } catch {
      throw new UnauthorizedException();
    }

    const tenantId = payload['tenant_id'];
    const groups: unknown = payload['cognito:groups'];
    if (
      typeof tenantId !== 'string' ||
      !UUID.test(tenantId) ||
      !isGroupList(groups)
    ) {
      throw new UnauthorizedException();
    }

    request.tenantId = tenantId.toLowerCase();
    request.user = { sub: payload.sub, groups };
    return true;
  }
}

function isGroupList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((group) => typeof group === 'string')
  );
}
