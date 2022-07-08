import { ColorResolvable } from 'discord.js';

import IConfig from './structures/Config';

class Config implements IConfig {
  readonly discordToken: string;
  readonly ownerDiscordID: string;
  readonly developmentGuild: string;
  readonly suggestionsChannel: string;
  readonly mongoUri: string;
  readonly apiPort: number;
  readonly color: ColorResolvable;
  readonly coinbaseApiKey: string;

  constructor() {
    this.discordToken = process.env.DISCORD_TOKEN!;
    this.ownerDiscordID = '727224012912197652';
    this.developmentGuild = '846470870385426452';
    this.suggestionsChannel = '994807130316087348';
    this.mongoUri = process.env.MONGO_URI!;
    this.apiPort = Number(process.env.API_PORT!);
    this.color = 'AQUA';
    this.coinbaseApiKey = process.env.COINBASE_API_KEY!;
  }
}

export default Config;
