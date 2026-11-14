import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminGetUserCommand,
  AdminListGroupsForUserCommand,
  CognitoIdentityProviderClient,
  type AttributeType,
} from '@aws-sdk/client-cognito-identity-provider';
import { Injectable } from '@nestjs/common';

export interface CognitoUser {
  sub: string;
  tenantId: string | undefined;
  groups: string[];
  signedIn: boolean;
}

function attribute(
  attributes: AttributeType[] | undefined,
  name: string,
): string | undefined {
  return attributes?.find((a) => a.Name === name)?.Value;
}

@Injectable()
export class CognitoUsers {
  private readonly client = new CognitoIdentityProviderClient({});
  private readonly userPoolId: string;

  constructor() {
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    if (!userPoolId) {
      throw new Error('COGNITO_USER_POOL_ID must be set');
    }
    this.userPoolId = userPoolId;
  }

  async findByEmail(email: string): Promise<CognitoUser | null> {
    let user;
    try {
      user = await this.client.send(
        new AdminGetUserCommand({
          UserPoolId: this.userPoolId,
          Username: email,
        }),
      );
    } catch (error) {
      if (error instanceof Error && error.name === 'UserNotFoundException') {
        return null;
      }
      throw error;
    }
    const groups = await this.client.send(
      new AdminListGroupsForUserCommand({
        UserPoolId: this.userPoolId,
        Username: email,
      }),
    );
    return {
      sub: attribute(user.UserAttributes, 'sub') ?? '',
      tenantId: attribute(user.UserAttributes, 'custom:tenant_id'),
      groups: (groups.Groups ?? []).flatMap((g) =>
        g.GroupName ? [g.GroupName] : [],
      ),
      signedIn: user.UserStatus !== 'FORCE_CHANGE_PASSWORD',
    };
  }

  async create(email: string, tenantId: string): Promise<{ sub: string }> {
    const result = await this.client.send(
      new AdminCreateUserCommand({
        UserPoolId: this.userPoolId,
        Username: email,
        MessageAction: 'SUPPRESS',
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'custom:tenant_id', Value: tenantId },
        ],
      }),
    );
    const sub = attribute(result.User?.Attributes, 'sub');
    if (!sub) {
      throw new Error('Cognito returned a user without sub');
    }
    return { sub };
  }

  async addToGroup(sub: string, group: string): Promise<void> {
    await this.client.send(
      new AdminAddUserToGroupCommand({
        UserPoolId: this.userPoolId,
        Username: sub,
        GroupName: group,
      }),
    );
  }

  async sendInvitation(email: string): Promise<void> {
    await this.client.send(
      new AdminCreateUserCommand({
        UserPoolId: this.userPoolId,
        Username: email,
        MessageAction: 'RESEND',
      }),
    );
  }
}
