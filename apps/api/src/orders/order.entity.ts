import type { Opt } from '@mikro-orm/core';
import {
  Check,
  Entity,
  Index,
  ManyToOne,
  PrimaryKey,
  Property,
  Unique,
} from '@mikro-orm/decorators/legacy';
import { Store } from '../stores/store.entity.js';
import { Tenant } from '../tenants/tenant.entity.js';
 
@Entity({ tableName: 'orders' })
@Index({ properties: ['tenant', 'deliveryDate'] })
@Index({ properties: ['tenant', 'store'] })
@Check({ expression: 'size > 0' })
export class Order {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: Opt<string>;
 
  @ManyToOne(() => Tenant)
  tenant!: Tenant;
 
  @ManyToOne(() => Store)
  store!: Store;
 
  // A calendar day, no time or zone: 'YYYY-MM-DD'.
  @Property({ type: 'date' })
  deliveryDate!: string;
 
  // Same unit as vehicles.capacity.
  @Property({ type: 'integer' })
  size!: number;
 
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
 