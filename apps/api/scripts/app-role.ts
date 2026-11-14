import type { EntityManager } from '@mikro-orm/postgresql';

export const APP_ROLE = 'routedesk_app';

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export async function setAppRolePassword(
  em: EntityManager,
  password: string,
): Promise<boolean> {
  const connection = em.getConnection();
  const existing = await connection.execute(
    'select 1 from pg_roles where rolname = ?',
    [APP_ROLE],
  );
  if (existing.length === 0) {
    return false;
  }
  await connection.execute(
    `alter role "${APP_ROLE}" password ${sqlLiteral(password)}`,
  );
  return true;
}
