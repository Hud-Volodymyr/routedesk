import type { PolicyDef } from '@mikro-orm/core';

export function tenantIsolation(column: 'tenant_id' | 'id'): {
  rowLevelSecurity: 'force';
  policies: PolicyDef[];
} {
  const sameTenant = `${column} = nullif(current_setting('app.tenant_id', true), '')::uuid`;
  return {
    rowLevelSecurity: 'force',
    policies: [
      { name: 'tenant_isolation', using: sameTenant, check: sameTenant },
    ],
  };
}
