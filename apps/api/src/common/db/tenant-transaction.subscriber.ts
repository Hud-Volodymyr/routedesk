import type { EventSubscriber, TransactionEventArgs } from '@mikro-orm/core';
import { tenantContext } from './tenant-context.js';

export class TenantTransactionSubscriber implements EventSubscriber {
  async afterTransactionStart(args: TransactionEventArgs): Promise<void> {
    const tenantId = tenantContext.getStore();
    if (!tenantId || !args.transaction) {
      return;
    }
    await args.em
      .getConnection()
      .execute(
        "select set_config('app.tenant_id', ?, true)",
        [tenantId],
        'all',
        args.transaction,
      );
  }
}
