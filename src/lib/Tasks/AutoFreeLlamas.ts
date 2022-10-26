import { TextChannel, EmbedBuilder, userMention } from 'discord.js';
import { Endpoints, Client } from 'fnbr';
import { promisify } from 'util';

import Task from '../../structures/Task';
import Bot from '../../client/Client';
import getLogger from '../../Logger';
import type { IEpicAccount } from '../../database/models/typings';
import Emojis from '../../resources/Emojis';

const wait = promisify(setTimeout);

class AutoFreeLlamas implements Task {
  private bot: Bot;

  private logger = getLogger('AUTO LLAMAS');

  constructor(bot: Bot) {
    this.bot = bot;
  }

  public async start() {
    this.logger.info('Registering auto free llamas task');

    setInterval(async () => {
      await this.runTask();
    }, 15 * 60 * 1000);
  }

  private async runTask() {
    const start = Date.now();
    this.logger.info('Running auto free llamas task');

    const logChannel = (await this.bot.channels
      .fetch(this.bot._config.freeLlamasChannel, {
        allowUnknownGuild: true,
      })
      .catch((e) => {
        this.logger.error(`Could not fetch free llamas channel: ${e}`);
        return null;
      })) as TextChannel;

    // eslint-disable-next-line no-restricted-syntax
    for await (const user of this.bot.userModel.find({})) {
      const isPremium =
        user.premiumUntil.getTime() > Date.now() || user.isPartner;

      const epicAccounts = (user.epicAccounts as IEpicAccount[]).filter(
        (a) => a.autoFreeLlamas,
      );

      if (epicAccounts.length === 0) {
        // eslint-disable-next-line no-continue
        continue;
      }

      if (!isPremium) {
        await Promise.all(
          epicAccounts.map(async (epicAccount) => {
            if (epicAccount.autoFreeLlamas) {
              await this.bot.epicAccountModel.findOneAndUpdate(
                {
                  accountId: epicAccount.accountId,
                },
                {
                  $set: {
                    autoFreeLlamas: false,
                  },
                },
              );
            }
          }),
        );

        return;
      }

      let description = '';
      // eslint-disable-next-line no-restricted-syntax
      for await (const a of epicAccounts) {
        description += await this.checkAndClaimFreeLlamas(a);
        description += '\n\n';

        await wait(1000);
      }

      const embed = new EmbedBuilder()
        .setColor(this.bot._config.color)
        .setAuthor({
          name: `Auto Free Llama's Rewards | Save the World`,
        })
        .setTimestamp()
        .setDescription(description);

      // check if description is empty
      if (embed.data.description!.replace(/\n/g, '').length === 0) {
        // eslint-disable-next-line no-continue
        continue;
      }

      if (!logChannel) {
        this.logger.error('Log channel not found');
      }

      if (user.notifications) {
        await this.bot.users
          .send(user.id, {
            content: userMention(user.id),
            embeds: [embed],
          })
          .catch((e) =>
            this.logger.error(
              `Unable to send message to User ${user.id}: ${e}`,
            ),
          );

        embed.setDescription(
          `Successfully claimed free llama rewards for ${epicAccounts.length} epic accounts.`,
        );
      }

      await logChannel?.send({
        content: user.notifications ? ' ' : userMention(user.id),
        embeds: [embed],
      });
    }

    this.logger.info(
      `Auto free llamas task finished [${(Date.now() - start).toFixed(2)}ms]`,
    );
  }

  private async checkAndClaimFreeLlamas(
    epicAccount: IEpicAccount,
    retry = true,
  ): Promise<string> {
    let result = '';

    try {
      const client = await this.bot.fortniteManager.clientFromDeviceAuth(
        epicAccount.accountId,
        epicAccount.deviceId,
        epicAccount.secret,
      );

      let nClaimed = 0;
      let availableLlama: string = '';
      try {
        availableLlama = await this.getAvailableFreeLlama(client);
      } catch (e) {
        // ignore
      }

      let claimed: boolean;
      if (availableLlama && availableLlama.length !== 0) {
        claimed = await this.purchaseFreeLlama(
          client,
          epicAccount.accountId,
          availableLlama,
        );
        nClaimed += claimed ? 1 : 0;

        try {
          availableLlama = await this.getAvailableFreeLlama(client);
        } catch (e) {
          // ignore
        }

        if (availableLlama && availableLlama.length !== 0) {
          claimed = await this.purchaseFreeLlama(
            client,
            epicAccount.accountId,
            availableLlama,
          );
          nClaimed += claimed ? 1 : 0;
        } else {
          return '';
        }

        if (nClaimed === 0) {
          return '';
        }

        result = `${Emojis.tick} **${epicAccount.displayName}**
Successfully claimed ${nClaimed} free llama${nClaimed > 1 ? 's' : ''}`;
      } else {
        return '';
      }
    } catch (e: any) {
      if (
        `${e}`.includes('account you are using is not active') ||
        `${e}`.includes(
          'Sorry the account credentials you are using are invalid',
        )
      ) {
        try {
          await this.bot.epicAccountModel.findOneAndUpdate(
            {
              accountId: epicAccount.accountId,
            },
            {
              $set: {
                autoFreeLlamas: false,
              },
            },
          );
        } catch (err) {
          // ignore
        }

        return '';
      }

      // handle token errors
      if (
        (`${e}`.includes('Sorry the refresh token') ||
          `${e}`.includes('Malformed auth token')) &&
        retry
      ) {
        await this.bot.fortniteManager.removeAccount(epicAccount.accountId);
        return this.checkAndClaimFreeLlamas(epicAccount, false);
      }

      result = `${Emojis.cross} **${epicAccount.displayName}**
${e}`;
    }

    return result;
  }

  // eslint-disable-next-line class-methods-use-this
  private async getAvailableFreeLlama(client: Client) {
    const res = await client.http.sendEpicgamesRequest(
      true,
      'GET',
      'https://fortnite-public-service-prod11.ol.epicgames.com/fortnite/api/storefront/v2/catalog',
      'fortnite',
      {},
    );

    if (res.error) {
      throw new Error(res.error.message ?? res.error.code);
    }

    let { storefronts } = res.response;
    storefronts = storefronts
      .filter(
        (s: any) =>
          s.name === 'CardPackStorePreroll' ||
          s.name === 'CardPackStoreGameplay',
      )
      .map((s: any) => s.catalogEntries)
      .flat()
      .filter(
        (s: any) =>
          (s.devName ?? '').includes('RandomFree') ||
          (s.devName ?? '').includes('FreePack') ||
          (s.title ?? '').includes('Seasonal Sale Freebie'),
      );

    if (storefronts.length === 0) {
      throw new Error('No free llama available');
    }

    return storefronts[0].offerId;
  }

  // eslint-disable-next-line class-methods-use-this
  private async purchaseFreeLlama(
    client: Client,
    accountId: string,
    offerId: string,
  ) {
    const res1 = await client.http.sendEpicgamesRequest(
      true,
      'POST',
      `${Endpoints.MCP}/${accountId}/client/PopulatePrerolledOffers?profileId=campaign`,
      'fortnite',
      { 'Content-Type': 'application/json' },
      {},
    );

    if (res1.error) {
      throw new Error(res1.error.message ?? res1.error.code);
    }

    const res2 = await client.http.sendEpicgamesRequest(
      true,
      'POST',
      `${Endpoints.MCP}/${accountId}/client/PurchaseCatalogEntry?profileId=common_core`,
      'fortnite',
      { 'Content-Type': 'application/json' },
      {
        offerId,
        purchaseQuantity: 1,
        currency: 'GameItem',
        currencySubType: 'AccountResource:currency_xrayllama',
        expectedTotalPrice: 0,
        gameContext: '',
      },
    );

    if (res2.error) {
      if (!res2.error!.message.includes('it would exceed the daily limit of')) {
        throw new Error(res2.error.message ?? res2.error.code);
      } else {
        return false;
      }
    }

    return true;
  }
}

export default AutoFreeLlamas;
