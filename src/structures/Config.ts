import { ColorResolvable } from 'discord.js';

interface IConfig {
  readonly discordToken: string;
  readonly ownerDiscordID: string;
  readonly developmentGuild: string;
  readonly mongoUri: string;
  readonly apiPort: number;
  readonly color: ColorResolvable;
}

export default IConfig;
