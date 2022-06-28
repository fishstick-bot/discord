import express, { Express } from 'express';
import compression from 'compression';

import Bot from '../client/Client';
import getLogger from '../Logger';
import {
  ICosmeticRarity,
  ICosmeticSeries,
  ICosmeticType,
  ICosmeticSet,
} from '../database/models/typings';

class API {
  // bot
  private bot: Bot;

  // express app
  private app: Express;

  // logger for api
  public logger = getLogger('API');

  constructor(bot: Bot) {
    this.bot = bot;

    this.app = express();
    this.app.use(compression());
    this.app.use((req, res, next) => {
      this.logger.info(`${req.method} ${req.url} (${req.ip})`);
      next();
    });
  }

  public async start() {
    this.handleRoutes();

    this.app.listen(this.bot._config.apiPort, async () => {
      this.logger.info(`API listening on port ${this.bot._config.apiPort}`);
    });
  }

  private async handleRoutes() {
    this.app.get('/api/status', async (req, res) =>
      res.json({
        success: true,
      })
    );

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

        const cosmetics = this.bot.cosmeticService.parsedCosmetics;

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
