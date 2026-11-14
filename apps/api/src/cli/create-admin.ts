import { parseArgs } from 'node:util';
import { MikroORM, RequestContext } from '@mikro-orm/core';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { UsersService } from '../users/users.service.js';

const { values } = parseArgs({
  options: {
    tenant: { type: 'string' },
    email: { type: 'string' },
    name: { type: 'string' },
  },
});

if (!values.tenant || !values.email || !values.name) {
  console.error(
    'Usage: create-admin -- --tenant <id> --email <email> --name <name>',
  );
  process.exit(1);
}
const { tenant, email, name } = values;

const app = await NestFactory.createApplicationContext(AppModule, {
  logger: ['error'],
});
try {
  const orm = app.get(MikroORM);
  const users = app.get(UsersService);
  const admin = await RequestContext.create(orm.em, () => {
    RequestContext.getEntityManager()?.setSessionContext({
      variables: { 'app.tenant_id': tenant },
    });
    return users.ensureAdmin(tenant, email, name);
  });
  console.log(`Admin ready: ${admin.email} (${admin.id}) in tenant ${tenant}`);
} finally {
  await app.close();
}
