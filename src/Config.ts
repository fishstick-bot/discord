import IConfig from './structures/Config';

class Config implements IConfig {
  readonly discordToken: string;
  readonly ownerDiscordID: string;
  readonly developmentGuild: string;
  readonly mongoUri: string;
  readonly apiPort: number;

  constructor() {
    this.discordToken = process.env.DISCORD_TOKEN!;
    this.ownerDiscordID = '727224012912197652';
    this.developmentGuild = '846470870385426452';
    this.mongoUri = process.env.MONGO_URI!;
    this.apiPort = Number(process.env.API_PORT!);
  }
}

export default Config;
