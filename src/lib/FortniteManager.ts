import { Collection } from 'discord.js';
import { Client, Endpoints } from 'fnbr';
import AuthClients from 'fnbr/dist/resources/AuthClients';

import Bot from '../client/Client';

export interface STWProfile {
  resources: {
    id: string;
    quantity: number;
  }[];
  accountLevel: number;
  backpackSize: number;
  storageSize: number;
}

class FortniteManager {
  private bot: Bot;

  private clients: Collection<string, Client> = new Collection();

  constructor(bot: Bot) {
    this.bot = bot;
  }

  public async clientFromAuthorizationCode(code: string) {
    const client = new Client({
      auth: {
        authorizationCode: code,
        checkEULA: true,
        killOtherTokens: false,
        createLauncherSession: false,
      },
      connectToXMPP: false,
      createParty: false,
      fetchFriends: false,
    });
    await client.login();
    this.clients.set(client.user!.id, client);

    const deviceauth = await client.http.sendEpicgamesRequest(
      true,
      'POST',
      `${Endpoints.OAUTH_DEVICE_AUTH}/${
        client.auth.auths.get('fortnite')?.account_id
      }/deviceAuth`,
      'fortnite',
    );

    const avatarId = (await client.user?.getAvatar())?.id?.split(':')[1];

    return {
      accountId: client.user!.id,
      displayName: client.user!.displayName,
      avatar: avatarId
        ? `https://fortnite-api.com/images/cosmetics/br/${avatarId}/icon.png`
        : 'https://fishstickbot.com/fishstick.png',
      deviceAuth: {
        accountId: deviceauth.response.accountId,
        deviceId: deviceauth.response.deviceId,
        secret: deviceauth.response.secret,
      },
    };
  }

  public async clientFromDeviceAuth(
    accountId: string,
    deviceId: string,
    secret: string,
  ) {
    if (this.clients.has(accountId)) {
      return this.clients.get(accountId)!;
    }

    const client = new Client({
      auth: {
        checkEULA: true,
        killOtherTokens: false,
        createLauncherSession: false,
        deviceAuth: {
          accountId,
          deviceId,
          secret,
        },
      },
      connectToXMPP: false,
      createParty: false,
      fetchFriends: false,
      // eslint-disable-next-line no-console
      // debug: console.log,
    });
    await client.login();
    this.clients.set(client.user!.id, client);

    return this.clients.get(accountId)!;
  }

  public async getAccountInfo(accountId: string) {
    if (!this.clients.has(accountId)) {
      throw new Error('No client found for this account.');
    }

    const client = this.clients.get(accountId)!;
    await client.user!.fetch();

    return {
      ...client.user!.toObject(),
      firstName: client.user!.name,
      lastName: client.user!.lastName,
    };
  }

  public async createBearerToken(
    accountId: string,
    deviceId: string,
    secret: string,
  ) {
    if (!this.clients.has(accountId)) {
      throw new Error('No client found for this account.');
    }

    const client = this.clients.get(accountId)!;

    const authClientData = AuthClients.fortniteIOSGameClient;
    const authClientToken = Buffer.from(
      `${authClientData.clientId}:${authClientData.secret}`,
    ).toString('base64');

    const token = await client.http.sendEpicgamesRequest(
      false,
      'POST',
      Endpoints.OAUTH_TOKEN_CREATE,
      undefined,
      {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `basic ${authClientToken}`,
      },
      null,
      {
        grant_type: 'device_auth',
        token_type: 'bearer',
        account_id: accountId,
        device_id: deviceId,
        secret,
      },
    );

    if (token.error) {
      throw new Error(token.error.message ?? token.error.code);
    }

    return token.response.access_token;
  }

  public async killBearerToken(accountId: string, token?: string) {
    if (!this.clients.has(accountId)) {
      throw new Error('No client found for this account.');
    }

    const client = this.clients.get(accountId)!;

    if (token) {
      const res = await client.http.sendEpicgamesRequest(
        false,
        'DELETE',
        `${Endpoints.OAUTH_TOKEN_KILL}/${token}`,
        'fortnite',
      );

      if (res.error) {
        throw new Error(res.error.message ?? res.error.code);
      }
    } else {
      const res = await client.http.sendEpicgamesRequest(
        false,
        'DELETE',
        `${Endpoints.OAUTH_TOKEN_KILL_MULTIPLE}?killType=ALL`,
        'fortnite',
      );

      if (res.error) {
        throw new Error(res.error.message ?? res.error.code);
      }
    }
  }

  public async createExchangeCode(accountId: string) {
    if (!this.clients.has(accountId)) {
      throw new Error('No client found for this account.');
    }

    const client = this.clients.get(accountId)!;

    const res = await client.http.sendEpicgamesRequest(
      true,
      'GET',
      Endpoints.OAUTH_EXCHANGE,
      'fortnite',
    );

    if (res.error) {
      throw new Error(res.error.message ?? res.error.code);
    }

    return res.response.code;
  }

  public async createAuthorizationCode(
    accountId: string,
    clientId: string = '3446cd72694c4a4485d81b77adbb2141',
  ) {
    if (!this.clients.has(accountId)) {
      throw new Error('No client found for this account.');
    }

    const client = this.clients.get(accountId)!;
    const authData = client.auth.auths.get('fortnite');

    const res = await client.http.sendEpicgamesRequest(
      true,
      'GET',
      `https://www.epicgames.com/id/api/redirect?clientId=${clientId}&responseType=code`,
      'fortnite',
      { Cookie: `EPIC_BEARER_TOKEN=${authData?.token}` },
    );

    if (res.error) {
      throw new Error(res.error.message ?? res.error.code);
    }

    return res.response.authorizationCode;
  }

  public async searchPlayer(accountId: string, prefix: string) {
    if (!this.clients.has(accountId)) {
      throw new Error('No client found for this account.');
    }

    const client = this.clients.get(accountId)!;

    const search = await client.searchProfiles(prefix);

    if (search.length === 0) {
      throw new Error('No player found.');
    }

    const firstsearch = search[0];

    return {
      accountId: firstsearch.id,
      displayName: firstsearch.matches[0].value,
    };
  }

  public async getSTWProfile(
    accountId: string,
    player: string,
  ): Promise<STWProfile> {
    if (!this.clients.has(accountId)) {
      throw new Error('No client found for this account.');
    }

    const client = this.clients.get(accountId)!;

    const stw = await client.getSTWProfile(player);

    const mfa = stw.stats.mfaRewardClaimed;
    let backpackSize = 50;
    const storageSize = 0;

    // eslint-disable-next-line no-restricted-syntax
    for (const item of stw.items) {
      if (item.templateId === 'HomebaseNode:skilltree_backpacksize') {
        backpackSize = item.quantity * 20;
      }
    }

    if (mfa) {
      backpackSize += 10;
    }

    return {
      // stw resources for the profile
      resources: stw.resources.map((r) => ({
        id: r.templateId.split(':')[1],
        quantity: r.quantity,
      })),
      accountLevel: stw.stats.actualLevel,
      backpackSize,
      storageSize,
    };
  }
}

export default FortniteManager;
