import IConfig from './structures/Config';

class Config implements IConfig {
  readonly discordToken: string;
  readonly mongoUri: string;

  constructor() {
    this.discordToken = process.env.DISCORD_TOKEN!;
    this.mongoUri = process.env.MONGO_URI!;
  }
}

export default Config;
