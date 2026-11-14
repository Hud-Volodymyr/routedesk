import { Transactional } from '@mikro-orm/decorators/legacy';
import { EntityManager } from '@mikro-orm/postgresql';
import { ConflictException, Injectable } from '@nestjs/common';
import { Driver } from '../drivers/driver.entity.js';
import { Tenant } from '../tenants/tenant.entity.js';
import { CognitoUsers } from './cognito-users.js';
import type { CreatedUser, CreateUserBody } from './dto/create-user.body.js';
import { User } from './user.entity.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly em: EntityManager,
    private readonly cognito: CognitoUsers,
  ) {}

  async create(tenantId: string, input: CreateUserBody): Promise<CreatedUser> {
    const existing = await this.cognito.findByEmail(input.email);
    if (
      existing &&
      (existing.tenantId !== tenantId ||
        existing.signedIn ||
        existing.groups.some((group) => group !== input.role))
    ) {
      throw new ConflictException();
    }

    const sub =
      existing?.sub ?? (await this.cognito.create(input.email, tenantId)).sub;
    const user = await this.ensureDatabaseUser(tenantId, sub, input);

    if (!existing?.groups.includes(input.role)) {
      await this.cognito.addToGroup(sub, input.role);
    }
    await this.cognito.sendInvitation(input.email);

    return {
      id: user.id,
      email: input.email,
      name: input.name,
      role: input.role,
    };
  }

  @Transactional()
  private async ensureDatabaseUser(
    tenantId: string,
    sub: string,
    input: CreateUserBody,
  ): Promise<User> {
    const tenant = await this.em.findOneOrFail(Tenant, { id: tenantId });
    const user =
      (await this.em.findOne(User, { cognitoSub: sub })) ??
      this.em.create(User, {
        tenant,
        cognitoSub: sub,
        email: input.email,
        name: input.name,
      });

    if (input.role === 'driver') {
      const driver = await this.em.findOne(Driver, { user });
      if (!driver) {
        this.em.create(Driver, { user, tenant, phone: input.phone });
      }
    }

    return user;
  }
}
