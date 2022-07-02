import express, { Express } from 'express';
import compression from 'compression';

import Bot from '../client/Client';
import getLogger from '../Logger';

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
      }),
    );
  }
}

export default API;
