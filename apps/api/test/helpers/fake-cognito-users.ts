import { randomUUID } from 'node:crypto';
import type { CognitoUser } from '../../src/users/cognito-users.js';

type Method = 'findByEmail' | 'create' | 'addToGroup' | 'sendInvitation';

export interface FakeCognitoRecord extends CognitoUser {
  email: string;
  invitations: number;
}

export class FakeCognitoUsers {
  readonly users = new Map<string, FakeCognitoRecord>();
  private failing: Method | undefined;

  failOnce(method: Method): void {
    this.failing = method;
  }

  add(
    record: Omit<FakeCognitoRecord, 'sub'> & { sub?: string },
  ): FakeCognitoRecord {
    const full = { ...record, sub: record.sub ?? randomUUID() };
    this.users.set(full.email, full);
    return full;
  }

  findByEmail(email: string): Promise<CognitoUser | null> {
    this.maybeFail('findByEmail');
    const user = this.users.get(email);
    return Promise.resolve(
      user
        ? {
            sub: user.sub,
            tenantId: user.tenantId,
            groups: [...user.groups],
            signedIn: user.signedIn,
          }
        : null,
    );
  }

  create(email: string, tenantId: string): Promise<{ sub: string }> {
    this.maybeFail('create');
    if (this.users.has(email)) {
      return Promise.reject(new Error('UsernameExistsException'));
    }
    const user = this.add({
      email,
      tenantId,
      groups: [],
      signedIn: false,
      invitations: 0,
    });
    return Promise.resolve({ sub: user.sub });
  }

  addToGroup(sub: string, group: string): Promise<void> {
    this.maybeFail('addToGroup');
    const user = this.bySub(sub);
    if (!user.groups.includes(group)) {
      user.groups.push(group);
    }
    return Promise.resolve();
  }

  sendInvitation(email: string): Promise<void> {
    this.maybeFail('sendInvitation');
    const user = this.users.get(email);
    if (!user) {
      return Promise.reject(new Error('UserNotFoundException'));
    }
    user.invitations++;
    return Promise.resolve();
  }

  private bySub(sub: string): FakeCognitoRecord {
    const user = [...this.users.values()].find((u) => u.sub === sub);
    if (!user) {
      throw new Error('UserNotFoundException');
    }
    return user;
  }

  private maybeFail(method: Method): void {
    if (this.failing === method) {
      this.failing = undefined;
      throw new Error(`Fake Cognito failure in ${method}`);
    }
  }
}
