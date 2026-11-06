import { EntityRepository } from '@mikro-orm/postgresql';
import type { Depot } from './depot.entity.js';

export class DepotRepository extends EntityRepository<Depot> {}
