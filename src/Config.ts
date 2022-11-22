import { ColorResolvable, Colors } from 'discord.js';

import IConfig from './structures/Config';

class Config implements IConfig {
  readonly discordToken: string;
  readonly ownerDiscordID: string;
  readonly developmentGuild: string;
  readonly dailyRewardsChannel: string;
  readonly freeLlamasChannel: string;
  readonly suggestionsChannel: string;
  readonly mongoUri: string;
  readonly apiPort: number;
  readonly color: ColorResolvable;
  readonly loggingWebhook: string;
  readonly fortniteApiIoApiKey: string;

  constructor() {
    this.discordToken = process.env.DISCORD_TOKEN!;
    this.ownerDiscordID = '1044582455287488582';
    this.developmentGuild = '846470870385426452';
    this.dailyRewardsChannel = '807888692294582272';
    this.freeLlamasChannel = '809684162101248030';
    this.suggestionsChannel = '994807130316087348';
    this.mongoUri = process.env.MONGO_URI!;
    this.apiPort = Number(process.env.API_PORT!);
    this.color = Colors.Aqua;
    this.loggingWebhook = process.env.LOGGING_WEBHOOK!;
    this.fortniteApiIoApiKey = process.env.FORTNITE_API_IO_API_KEY!;
  }
}

export default Config;
