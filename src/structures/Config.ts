import { ColorResolvable } from 'discord.js';

interface IConfig {
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
}

export default IConfig;
