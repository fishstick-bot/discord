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
  PremiumKeyModel,
} from '../database/models';
import CosmeticService from '../lib/Services/CosmeticService';
import STWMissionsService from '../lib/Services/STWMissionsService';
import API from '../lib/Services/API';
import FortniteManager from '../lib/FortniteManager';
import type { ICommand } from '../structures/Command';
import type IEvent from '../structures/Event';
import type Task from '../structures/Task';

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

  // premium key model
  public premiumKeyModel = PremiumKeyModel;

  // cosmetic service
  public cosmeticService = new CosmeticService(this);

  // stw missions service
  public stwMissionsService = new STWMissionsService(this);

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
        parse: ['users', 'roles'],
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
      restRequestTimeout: 30 * 1000,
      shards: Cluster.data.SHARD_LIST,
      shardCount: Cluster.data.TOTAL_SHARDS,
    });

    this._config = new Config();
    this.logger = getLogger(`BOT (CLUSTER ${this.cluster.id})`);
  }

  // start the bot
  public async start(): Promise<void> {
    // start discord bot
    const start = Date.now();
    await this.login(this._config.discordToken);
    this.logger.info(
      `Logged in as ${this.user?.tag} [${(Date.now() - start).toFixed(2)}ms]`,
    );

    // set bot status
    this.user?.setActivity({
      type: 'PLAYING',
      name: `/help in ${await this.getGuildCount()} servers`,
    });

    // set bot status every 5mins
    setInterval(async () => {
      this.user?.setActivity({
        type: 'PLAYING',
        name: `/help in ${await this.getGuildCount()} servers`,
      });
    }, 5 * 60 * 1000);

    // connect to database
    await connectToDatabase();

    if (this.isMainProcess) {
      // start cosmetics service
      this.cosmeticService.start();

      // start stw missions service
      this.stwMissionsService.start();

      // start bot api
      this.botAPI.start();
    }

    // load commands
    await this._loadCommands();

    // load event listeners
    await this._loadEventListeners();

    // load tasks
    await this._loadTasks();
  }

  public get isMainProcess(): boolean {
    return this.cluster.id === 0;
  }

  public async getGuildCount(): Promise<number> {
    try {
      return (
        await this.cluster.broadcastEval((c) => c.guilds.cache.size)
      ).reduce((prev: number, value: number) => Number(prev + value), 0);
    } catch (e) {
      return 0;
    }
  }

  private async _loadCommands(): Promise<void> {
    const start = Date.now();
    const commandFiles = await globPromisify(
      `${__dirname}/../commands/**/*{.ts,.js}`,
    );

    await Promise.all(
      commandFiles.map(async (file) => {
        const command: ICommand = (await import(file)).default;
        this.commands.set(command.name, command);
        this.logger.debug(`Loaded command ${command.name}`);
      }),
    );

    this.logger.info(
      `Loaded ${this.commands.size} commands [${(Date.now() - start).toFixed(
        2,
      )}ms]`,
    );
  }

  private async _loadEventListeners(): Promise<void> {
    const start = Date.now();
    const eventFiles = await globPromisify(`${__dirname}/events/**/*{.ts,.js}`);

    await Promise.all(
      eventFiles.map(async (file) => {
        const event: IEvent = (await import(file)).default;
        this.on(event.name, event.run.bind(null, this));
        this.logger.debug(`Loaded event ${event.name}`);
      }),
    );

    this.logger.info(
      `Loaded ${eventFiles.length} events [${(Date.now() - start).toFixed(
        2,
      )}ms]`,
    );
  }

  private async _loadTasks(): Promise<void> {
    if (!this.isMainProcess) return;

    const start = Date.now();
    const taskFiles = await globPromisify(
      `${__dirname}/../lib/Tasks/**/*{.ts,.js}`,
    );

    await Promise.all(
      taskFiles.map(async (file) => {
        // eslint-disable-next-line new-cap
        const task: Task = new (await import(file)).default(this);
        task.start();
        this.logger.debug(`Loaded task ${file.split('.')[0].split('/').pop()}`);
      }),
    );

    this.logger.info(
      `Loaded ${taskFiles.length} tasks [${(Date.now() - start).toFixed(2)}ms]`,
    );
  }
}

export default Bot;
