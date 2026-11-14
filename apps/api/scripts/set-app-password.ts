import { MikroORM } from '@mikro-orm/postgresql';
import config from '../src/mikro-orm.config.js';
import { APP_ROLE, setAppRolePassword } from './app-role.js';

const password = process.env.APP_DB_PASSWORD;
if (!password) {
  throw new Error('APP_DB_PASSWORD must be set');
}

const orm = await MikroORM.init({ ...config, debug: false });
try {
  const updated = await setAppRolePassword(orm.em.fork(), password);
  console.log(
    updated
      ? `Password of ${APP_ROLE} set from APP_DB_PASSWORD.`
      : `${APP_ROLE} doesn't exist yet; run migrations first.`,
  );
} finally {
  await orm.close(true);
}
