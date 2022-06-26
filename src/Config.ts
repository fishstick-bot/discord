import IConfig from './structures/Config';

class Config implements IConfig {
  readonly discordToken: string;
  readonly mongoUri: string;
  readonly apiPort: number;

  constructor() {
    this.discordToken = process.env.DISCORD_TOKEN!;
    this.mongoUri = process.env.MONGO_URI!;
    this.apiPort = Number(process.env.API_PORT!);
  }
}

export default Config;
