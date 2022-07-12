import Service from '../../structures/Service';
import Bot from '../../client/Client';
import getLogger from '../../Logger';

class CatalogManager implements Service {
  private bot: Bot;

  private logger = getLogger('CATALOG MANAGER');

  constructor(bot: Bot) {
    this.bot = bot;
  }

  public async start() {
    // TODO: Implement
    this.logger.info('Starting Catalog Manager');
  }
}
