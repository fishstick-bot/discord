import { Collection } from 'discord.js';
import { Client, Endpoints } from 'fnbr';

import Bot from '../client/Client';

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
}

export default FortniteManager;
