import express, { Express } from 'express';
import compression from 'compression';

import Bot from '../../client/Client';
import getLogger from '../../Logger';
import {
  ICosmeticRarity, ICosmeticSeries, ICosmeticType, ICosmeticSet,
} from '../../database/models/typings';

class API {
  // bot
  private bot: Bot;

  // express app
  private app : Express;

  // logger for api
  public logger = getLogger('API');

  constructor(bot: Bot) {
    this.bot = bot;

    this.app = express();
    this.app.use(compression());
  }

  public async start() {
    this.handleRoutes();

    this.app.listen(this.bot._config.apiPort, async () => {
      this.logger.info(`API listening on port ${this.bot._config.apiPort}`);
    });
  }

  private async handleRoutes() {
    this.app.get('/api/status', async (req, res) => res.json({
      success: true,
    }));

    this.app.get('/api/cosmetics', async (req, res) => {
      try {
        let sendDescription = false;
        if (req.query.description) {
          sendDescription = true;
        }
        let sendSet = false;
        if (req.query.set) {
          sendSet = true;
        }

        const cosmetics = this.bot.cosmeticService.cosmetics.toJSON().map((c) => ({
          id: c.id.toLowerCase(),
          name: c.name,
          description: sendDescription ? c.description : undefined,
          type: (c.type as ICosmeticType).value,
          rarity: (c.rarity as ICosmeticRarity).value,
          series: c.series ? (c.series as ICosmeticSeries).value : null,
          set: sendSet ? (
            (c.set as ICosmeticSet)?.value ?? null
          ) : null,
          introduction: c.introduction ? {
            season: c.introduction.season,
            chapter: c.introduction.chapter,
            seasonNumber: c.introduction.seasonNumber,
          } : null,
          isExclusive: c.isExclusive,
          isCrew: c.gameplayTags.filter((t) => t.toLowerCase().includes('crewpack')).length > 0, // TODO: find out more way's to find exclusives, for eg: Loki skin don't has any crew tags in it.
          isSTW: c.gameplayTags.filter((t) => t.toLowerCase().includes('savetheworld') || t.toLowerCase().includes('stw')).length > 0,
          isBattlePass: c.gameplayTags.filter((t) => t.toLowerCase().includes('battlepass.paid')).length > 0,
          isFreePass: c.gameplayTags.filter((t) => t.toLowerCase().includes('battlepass.free')).length > 0,
          isItemShop: c.gameplayTags.filter((t) => t.toLowerCase().includes('itemshop')).length > 0,
          isPlaystation: c.gameplayTags.filter((t) => t.toLowerCase().includes('platform.ps4')).length > 0,
          isXbox: c.gameplayTags.filter((t) => t.toLowerCase().includes('platform.xbox')).length > 0,
          isPromo: c.gameplayTags.filter((t) => t.toLowerCase().includes('source.promo')).length > 0,
        }));

        return res.json({
          success: true,
          data: cosmetics,
        });
      } catch (e) {
        return res.status(500).json({
          success: false,
          error: e,
        });
      }
    });
  }
}

export default API;
