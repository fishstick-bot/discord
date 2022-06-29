import { Client, Intents, Collection } from 'discord.js';
import Cluster from 'discord-hybrid-sharding';
import glob from 'glob';
import { promisify } from 'util';

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
  UserModel,
  EpicAccountModel,
  SurvivorSquadPresetModel,
} from '../database/models';
import CosmeticService from '../lib/CosmeticService';
import API from '../lib/API';
import FortniteManager from '../lib/FortniteManager';
import type { ICommand } from '../structures/Command';
import type IEvent from '../structures/Event';

const globPromisify = promisify(glob);

class Bot extends Client {
  // bot config
  public _config: IConfig;
  // logger for this bot
  public logger = getLogger('BOT');

  // cluster client
  public cluster = new Cluster.Client(this);

  // commands
  public commands: Collection<string, ICommand> = new Collection();
  public cooldown = 4; // for premium, cooldown is half of regular cooldown
  public cooldowns: Collection<string, Collection<string, number>> =
    new Collection();

  public loginCooldowns: Collection<string, number> = new Collection();

  // cosmetic models
  public cosmeticModel = CosmeticModel;
  public cosmeticTypeModel = CosmeticTypeModel;
  public cosmeticRarityModel = CosmeticRarityModel;
  public cosmeticSeriesModel = CosmeticSeriesModel;
  public cosmeticSetModel = CosmeticSetModel;
  public cosmeticIntroducedInModel = CosmeticIntroducedInModel;

  // user models
  public userModel = UserModel;
  public epicAccountModel = EpicAccountModel;
  public survivorSquadPresetModel = SurvivorSquadPresetModel;

  // cosmetic service
  public cosmeticService = new CosmeticService(this);

  // bot api
  public botAPI = new API(this);

  // fortnite manager
  public fortniteManager = new FortniteManager(this);

  constructor() {
    super({
      intents: [Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.GUILDS],
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
  public async start(): Promise<void> {
    // start discord bot
    const start = Date.now();
    await this.login(this._config.discordToken);
    this.logger.info(
      `[CLUSTER ${this.cluster.id}] Logged in as ${this.user?.tag} [${(
        Date.now() - start
      ).toFixed(2)}ms]`
    );

    // connect to database
    await connectToDatabase();

    if (this.isMainProcess) {
      // start cosmetics service
      this.cosmeticService.start();

      // start bot api
      this.botAPI.start();

      // load commands
      await this._loadCommands();

      // load event listeners
      await this._loadEventListeners();
    }
  }

  public get isMainProcess(): boolean {
    return this.cluster.id === 0;
  }

  private async _loadCommands(): Promise<void> {
    const start = Date.now();
    const commandFiles = await globPromisify(
      `${__dirname}/../commands/**/*{.ts,.js}`
    );

    await Promise.all(
      commandFiles.map(async (file) => {
        const command: ICommand = (await import(file)).default;
        this.commands.set(command.name, command);
        this.logger.debug(
          `[CLUSTER ${this.cluster.id}] Loaded command ${command.name}`
        );
      })
    );

    this.logger.info(
      `[CLUSTER ${this.cluster.id}] Loaded ${this.commands.size} commands [${(
        Date.now() - start
      ).toFixed(2)}ms]`
    );
  }

  private async _loadEventListeners(): Promise<void> {
    const start = Date.now();
    const eventFiles = await globPromisify(`${__dirname}/events/**/*{.ts,.js}`);

    await Promise.all(
      eventFiles.map(async (file) => {
        const event: IEvent = (await import(file)).default;
        this.on(event.name, event.run.bind(null, this));
        this.logger.debug(
          `[CLUSTER ${this.cluster.id}] Loaded event ${event.name}`
        );
      })
    );

    this.logger.info(
      `[CLUSTER ${this.cluster.id}] Loaded ${eventFiles.length} events [${(
        Date.now() - start
      ).toFixed(2)}ms]`
    );
  }
}

export default Bot;
