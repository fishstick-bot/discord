import { MessageEmbed, TextChannel } from 'discord.js';
import axios from 'axios';
import { promisify } from 'util';
import cron from 'node-cron';
import * as fs from 'fs';
import sharp from 'sharp';
import moment from 'moment';

import Service from '../../structures/Service';
import Bot from '../../client/Client';
import getLogger from '../../Logger';
import drawShop from '../Images/BRCatalog';

const wait = promisify(setTimeout);

interface BRCatalog {
  date: string;
  uid: string;
  data: any[];
}

class CatalogService implements Service {
  private bot: Bot;

  private logger = getLogger('CATALOG MANAGER');

  public brCatalog: BRCatalog;

  constructor(bot: Bot) {
    this.bot = bot;

    this.brCatalog = {
      date: '',
      uid: '',
      data: [],
    };
  }

  public async start() {
    await this.fetchBRCatalog();

    cron.schedule(
      '0 0 * * *',
      async () => {
        await this.fetchBRCatalog();
        await this.postBrShopToTwitter();

        const embed = new MessageEmbed()
          .setColor(this.bot._config.color)
          .setTimestamp()
          .setTitle(
            `Battle Royale Item Shop | ${moment.utc().format('Do MMMM YYYY')}`,
          )
          .setImage(
            `https://fishstickbot.com/api/catalog/br/img/${this.brCatalog.date}.png`,
          );

        // eslint-disable-next-line no-restricted-syntax
        for await (const guild of this.bot.guildModel.find({
          itemShopChannelId: { $ne: '' },
        })) {
          await this.postToChannel(guild.itemShopChannelId, ' ', [embed]);
        }
      },
      {
        scheduled: true,
        timezone: 'Etc/UTC',
      },
    );
  }

  private async fetchBRCatalog(): Promise<BRCatalog> {
    let start = Date.now();
    try {
      const res = (
        await axios.get(
          'https://fortniteapi.io/v2/shop?lang=en&renderData=true',
          {
            headers: {
              Authorization: this.bot._config.fortniteApiIoApiKey,
            },
          },
        )
      ).data;

      this.brCatalog.date = res.lastUpdate?.date?.split(' ')[0] ?? '';
      this.brCatalog.uid = res.lastUpdate?.uid ?? '';
      this.brCatalog.data = res.shop;

      this.logger.info(
        `Fetched BR Catalog [${(Date.now() - start).toFixed(2)}ms]`,
      );

      start = Date.now();
      const img = await drawShop(this.brCatalog.data);
      await fs.promises.writeFile(`./Shop/BR/${this.brCatalog.date}.png`, img);
      this.logger.info(
        `Generated BR Catalog Image [${(Date.now() - start).toFixed(2)}ms]`,
      );

      return this.brCatalog;
    } catch (e) {
      this.logger.error(e);

      await wait(30 * 1000);
      return this.fetchBRCatalog();
    }
  }

  private async postBrShopToTwitter(): Promise<void> {
    const start = Date.now();
    try {
      const { twitterApi } = this.bot;

      const title = `#Fortnite Battle Royale Item Shop | ${moment
        .utc()
        .format('Do MMMM YYYY')}`;

      const res1 = await twitterApi.post('media/upload', {
        media_data: (
          await sharp(
            await fs.promises.readFile(`./Shop/BR/${this.brCatalog.date}.png`),
          )
            .toFormat('jpeg')
            .resize(2000)
            .toBuffer()
        ).toString('base64'),
      });
      const metaParams = {
        media_id: (res1.data as any).media_id_string,
        alt_text: {
          text: title,
        },
      };
      const res2 = await twitterApi.post('media/metadata/create', metaParams);
      const res3 = await twitterApi.post('statuses/update', {
        status: title,
        media_ids: [(res1.data as any).media_id_string],
      });

      this.bot.loggingWebhook.send(
        `Posted BR Shop to Twitter - ${(res3.data as any).text}`,
      );
      this.logger.info(
        `Posted BR Shop to Twitter [${(Date.now() - start).toFixed(2)}ms]`,
      );
    } catch (e: any) {
      this.logger.error(`Error posting to Twitter: ${e}`);

      await this.bot.loggingWebhook.send(
        `Error posting to Twitter: ${e}

\`\`\`${e.stack}\`\`\``,
      );
    }
  }

  private async postToChannel(
    channelId: string,
    message: string,
    embeds: MessageEmbed[],
  ) {
    try {
      const channel = (await this.bot.channels.fetch(channelId)) as TextChannel;

      if (channel) {
        await channel
          .send({
            content: message,
            embeds,
          })
          .catch(() => {});
      }
    } catch (e) {
      this.logger.error(`Error posting to channel ${channelId}: ${e}`);
    }
  }
}

export default CatalogService;
