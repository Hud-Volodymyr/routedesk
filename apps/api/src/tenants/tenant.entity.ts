import type { Opt } from '@mikro-orm/core';
import { Entity, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';
import { tenantIsolation } from '../common/db/tenant-isolation.js';

@Entity({ tableName: 'tenants', ...tenantIsolation('id') })
export class Tenant {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: Opt<string>;

  @Property({ type: 'text' })
  name!: string;

  @Property({
    type: 'datetime',
    columnType: 'timestamptz',
    defaultRaw: 'now()',
  })
  createdAt!: Opt<Date>;
}
