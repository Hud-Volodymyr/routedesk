import { Reflector } from '@nestjs/core';
import { Public } from './public.decorator.js';
import { Roles } from './roles.decorator.js';
import { RolesGuard } from './roles.guard.js';
import type { TenantRequest } from './tenant-request.js';
import {
  contextFor,
  rejectionOf,
  requestWith,
  type Handler,
} from '../../test/helpers/guard-context.js';

@Roles('admin', 'dispatcher')
class StaffController {
  handle(this: void): void {}

  @Roles('driver')
  driverOnly(this: void): void {}

  @Public()
  open(this: void): void {}
}

class UnmarkedController {
  handle(this: void): void {}
}

@Public()
class PublicController {
  handle(this: void): void {}
}

function requestFor(groups: string[]): TenantRequest {
  const request = requestWith({});
  request.user = { sub: 'user-123', groups };
  return request;
}

function check(
  controller: new () => object,
  handler: Handler,
  request: TenantRequest,
): boolean {
  return new RolesGuard(new Reflector()).canActivate(
    contextFor(controller, handler, request),
  );
}

const denied: [string, new () => object, Handler, string[]][] = [
  [
    'a user with none of the controller roles',
    StaffController,
    StaffController.prototype.handle,
    ['driver'],
  ],
  [
    'groups that are not a Role, even when close to one',
    StaffController,
    StaffController.prototype.handle,
    ['dispatchers', 'Admin', 'admin-dispatcher'],
  ],
  [
    'a controller role on a handler whose @Roles replaces it',
    StaffController,
    StaffController.prototype.driverOnly,
    ['admin', 'dispatcher'],
  ],
  [
    'every role on a route with no @Roles',
    UnmarkedController,
    UnmarkedController.prototype.handle,
    ['admin', 'dispatcher', 'driver'],
  ],
];

function rejectionFor(
  controller: new () => object,
  handler: Handler,
  groups: string[],
) {
  return rejectionOf(async () =>
    check(controller, handler, requestFor(groups)),
  );
}

describe('RolesGuard', () => {
  it('ROLE-1: allows a user whose groups include any one of the controller roles', () => {
    expect(
      check(
        StaffController,
        StaffController.prototype.handle,
        requestFor(['unknown', 'dispatcher']),
      ),
    ).toBe(true);
  });

  it('ROLE-1: allows a role listed only on the handler', () => {
    expect(
      check(
        StaffController,
        StaffController.prototype.driverOnly,
        requestFor(['driver']),
      ),
    ).toBe(true);
  });

  it.each([
    ['a @Public() handler', StaffController, StaffController.prototype.open],
    [
      'a handler of a @Public() controller',
      PublicController,
      PublicController.prototype.handle,
    ],
  ] as [string, new () => object, Handler][])(
    'ROLE-1: allows %s without a user',
    (_label, controller, handler) => {
      expect(check(controller, handler, requestWith({}))).toBe(true);
    },
  );

  it.each(denied)(
    'ROLE-1: denies %s with 403',
    async (_label, controller, handler, groups) => {
      expect(
        (await rejectionFor(controller, handler, groups)).getStatus(),
      ).toBe(403);
    },
  );

  it('ROLE-1: gives every 403 the same response', async () => {
    const responses = await Promise.all(
      denied.map(async ([, controller, handler, groups]) =>
        (await rejectionFor(controller, handler, groups)).getResponse(),
      ),
    );

    for (const response of responses) {
      expect(response).toEqual(responses[0]);
    }
  });
});
