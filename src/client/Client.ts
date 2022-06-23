import { Client, Intents } from 'discord.js';
import Cluster from 'discord-hybrid-sharding';

import IConfig from '../structures/Config';
import Config from '../Config';
import getLogger from '../Logger';
import connectToDatabase from '../database';
import {
  CosmeticModel,
  CosmeticTypeModel,
  CosmeticRarityModel,
  CosmeticSeriesModel,
  CosmeticSetModel,
  CosmeticIntroducedInModel,
} from '../database/models';
import CosmeticService from '../lib/CosmeticService';

class Bot extends Client {
  // bot config
  private _config: IConfig;
  // logger for this bot
  public logger = getLogger('BOT');

  // cosmetic models
  public cosmeticModel = CosmeticModel;
  public cosmeticTypeModel = CosmeticTypeModel;
  public cosmeticRarityModel = CosmeticRarityModel;
  public cosmeticSeriesModel = CosmeticSeriesModel;
  public cosmeticSetModel = CosmeticSetModel;
  public cosmeticIntroducedInModel = CosmeticIntroducedInModel;

  // cosmetic service
  public cosmeticService = new CosmeticService(this);

  constructor() {
    super({
      intents: [
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.GUILDS,
      ],
      partials: ['CHANNEL'],
      allowedMentions: {
        repliedUser: false,
      },
      presence: {
        status: 'online',
        activities: [
          {
            type: 'PLAYING',
            name: '/help',
          },
        ],
      },
      shards: Cluster.data.SHARD_LIST,
      shardCount: Cluster.data.TOTAL_SHARDS,
    });

    this._config = new Config();
  }

  // start the bot
  public async start() {
    const start = Date.now();
    await this.login(this._config.discordToken);
    this.logger.info(`Logged in as ${this.user?.tag} [${(Date.now() - start).toFixed(2)}ms]`);

    await connectToDatabase();

    this.cosmeticService.start();
  }
}

export default Bot;
