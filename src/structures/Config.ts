interface IConfig {
    readonly discordToken: string;
    readonly mongoUri: string;
    readonly apiPort: number;
}

export default IConfig;
