import Fastify, { FastifyInstance } from 'fastify';

import Bot from '../client/Client';
import getLogger from '../Logger';

class API {
  // bot
  private bot: Bot;

  // server
  public server: FastifyInstance;

  // logger for api
  public logger = getLogger('API');

  constructor(bot: Bot) {
    this.bot = bot;

    this.server = Fastify({});
  }

  public async start() {
    await this.server.register(import('@fastify/compress'), { global: false });
    await this.server.register(import('@fastify/cors'), {
      origin: '*',
    });
    await this.server.register(import('@fastify/swagger'), {
      routePrefix: '/api/docs',
      swagger: {
        info: {
          title: 'FishStick API',
          description: 'FishStick Bot API',
          version: '1.0.0',
        },
        // host: 'fishstickbot.com',
        // schemes: ['https'],
      },
      uiConfig: {
        docExpansion: 'full',
        deepLinking: false,
      },
      exposeRoute: true,
    });

    this.handleRoutes();

    await this.server.listen({
      port: this.bot._config.apiPort,
      path: '/api',
    });

    this.logger.info(`API listening on port ${this.bot._config.apiPort}`);
  }

  private async handleRoutes() {
    this.server.get(
      '/ping',
      {
        schema: {
          response: {
            200: {
              type: 'object',
              properties: {
                message: { type: 'string' },
              },
            },
          },
        },
      },
      async (req, res) => {
        this.logger.info(`GET /ping [${req.ip}]`);

        return {
          message: 'pong',
        };
      },
    );
  }
}

export default API;
