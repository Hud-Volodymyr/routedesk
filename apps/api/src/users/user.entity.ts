import type { Opt } from '@mikro-orm/core';
import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';
import { Tenant } from '../tenants/tenant.entity.js';

// Every user of every role. Roles are NOT stored here: Cognito groups are the only
// source of truth for roles, and the API reads them from the token.
@Entity({ tableName: 'users' })
export class User {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: Opt<string>;

  @ManyToOne(() => Tenant)
  tenant!: Tenant;

  // Cognito's permanent user ID (the token's `sub` claim).
  @Property({ type: 'text', unique: true })
  cognitoSub!: string;

  @Property({ type: 'text' })
  email!: string;

  @Property({ type: 'text' })
  name!: string;

  @Property({ type: 'datetime', columnType: 'timestamptz', defaultRaw: 'now()' })
  createdAt!: Opt<Date>;

  @Property({
    type: 'datetime',
    columnType: 'timestamptz',
    defaultRaw: 'now()',
    onUpdate: () => new Date(),
  })
  updatedAt!: Opt<Date>;
}
