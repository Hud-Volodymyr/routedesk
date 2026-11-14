import { Body, Controller, Post } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator.js';
import { TenantId } from '../auth/tenant-id.decorator.js';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe.js';
import {
  createUserBody,
  type CreatedUser,
  type CreateUserBody,
} from './dto/create-user.body.js';
import { UsersService } from './users.service.js';

@Roles('admin')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  create(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(createUserBody)) body: CreateUserBody,
  ): Promise<CreatedUser> {
    return this.users.create(tenantId, body);
  }
}
