interface IConfig {
  readonly discordToken: string;
  readonly ownerDiscordID: string;
  readonly developmentGuild: string;
  readonly mongoUri: string;
  readonly apiPort: number;
}

export default IConfig;
