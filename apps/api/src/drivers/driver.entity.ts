import type { Opt } from '@mikro-orm/core';
import { PrimaryKeyProp } from '@mikro-orm/core';
import { Entity, ManyToOne, OneToOne, Property } from '@mikro-orm/decorators/legacy';
import { Tenant } from '../tenants/tenant.entity.js';
import { User } from '../users/user.entity.js';

// 1:1 extension of User for people who drive. Its primary key IS the user's ID, so a
// driver can't exist without a user, and a user has at most one driver row.
@Entity({ tableName: 'drivers' })
export class Driver {
  [PrimaryKeyProp]?: 'user';

  @OneToOne(() => User, { primary: true, deleteRule: 'cascade' })
  user!: User;

  @ManyToOne(() => Tenant)
  tenant!: Tenant;

  @Property({ type: 'text', nullable: true })
  phone?: string | null;

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
