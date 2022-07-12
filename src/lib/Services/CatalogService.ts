import axios from 'axios';
import { promisify } from 'util';
import cron from 'node-cron';

import Service from '../../structures/Service';
import Bot from '../../client/Client';
import getLogger from '../../Logger';

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
      },
      {
        scheduled: true,
        timezone: 'Etc/UTC',
      },
    );
  }

  private async fetchBRCatalog(): Promise<BRCatalog> {
    const start = Date.now();
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

      return this.brCatalog;
    } catch (e) {
      this.logger.error(e);

      await wait(30 * 1000);
      return this.fetchBRCatalog();
    }
  }
}

export default CatalogService;
