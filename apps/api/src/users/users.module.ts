import { Module } from '@nestjs/common';
import { CognitoUsers } from './cognito-users.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  controllers: [UsersController],
  providers: [UsersService, CognitoUsers],
})
export class UsersModule {}
