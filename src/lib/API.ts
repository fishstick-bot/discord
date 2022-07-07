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
        host: 'fishstickbot.com',
        schemes: ['https'],
      },
      uiConfig: {
        deepLinking: false,
      },
      exposeRoute: true,
    });

    await this.addSchemas();
    await this.handleRoutes();

    await this.server.listen({
      port: this.bot._config.apiPort,
    });

    this.logger.info(`API listening on port ${this.bot._config.apiPort}`);
    this.server.printRoutes({ commonPrefix: false });
  }

  private async addSchemas() {
    this.server.addSchema({
      $id: 'Cosmetic',
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        type: { type: 'string' },
        rarity: { type: 'string' },
        series: { type: 'string', nullable: true },
        set: { type: 'string', nullable: true },
        introduction: {
          type: 'object',
          properties: {
            season: { type: 'string' },
            chapter: { type: 'string' },
            seasonNumber: { type: 'number' },
          },
          nullable: true,
        },
        isExclusive: { type: 'boolean' },
        isCrew: { type: 'boolean' },
        isSTW: { type: 'boolean' },
        isBattlePass: { type: 'boolean' },
        isFreePass: { type: 'boolean' },
        isItemShop: { type: 'boolean' },
        isPlaystation: { type: 'boolean' },
        isXbox: { type: 'boolean' },
        isPromo: { type: 'boolean' },
        image: { type: 'string' },
      },
    });

    this.server.addSchema({
      $id: 'STWMission',
      type: 'object',
      properties: {
        id: { type: 'string' },
        show: { type: 'boolean' },
        missionType: { type: 'string' },
        icon: { type: 'string' },
        area: { type: 'string' },
        biome: { type: 'string' },
        powerLevel: { type: 'number' },
        isGroupMission: { type: 'boolean' },
        modifiers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              icon: { type: 'string', nullable: true },
            },
          },
        },
        rewards: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              rarity: { type: 'string' },
              repeatable: { type: 'boolean' },
              amount: { type: 'number' },
            },
          },
        },
      },
    });
  }

  private async handleRoutes() {
    this.server.get(
      '/api/ping',
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
        this.logger.info(`GET /api/ping [${req.ip}]`);

        return {
          message: 'pong',
        };
      },
    );

    this.server.get(
      '/api/cosmetics',
      {
        schema: {
          response: {
            200: {
              type: 'array',
              items: { $ref: 'Cosmetic#' },
            },
          },
        },
      },
      async (req, res) => {
        this.logger.info(`GET /api/cosmetics [${req.ip}]`);

        const cosmetics = this.bot.cosmeticService.parsedCosmetics;
        return cosmetics;
      },
    );

    this.server.get(
      '/api/stwMissions',
      {
        schema: {
          response: {
            200: {
              type: 'array',
              items: { $ref: 'STWMission#' },
            },
          },
        },
      },
      async (req, res) => {
        this.logger.info(`GET /api/stwMissions [${req.ip}]`);

        const { missions } = this.bot.stwMissionsService;
        return missions;
      },
    );
  }
}

export default API;
