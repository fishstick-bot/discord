import type { CommandInteraction } from 'discord.js';
import type { SlashCommandBuilder } from '@discordjs/builders';

import Bot from '../client/Client';

// eslint-disable-next-line no-unused-vars
type ExecuteCommand = (bot : Bot, message : CommandInteraction) => Promise<void>;

interface CommandOptions {
    privateResponse?: boolean;

    guildOnly: boolean;
    dmOnly: boolean;

    premiumOnly: boolean;
    partnerOnly: boolean;
    ownerOnly: boolean;
}

export interface ICommand {
    name: string;
    description: string;
    category: string;

    slashCommandBuilder: SlashCommandBuilder;

    restrictions: CommandOptions;

    execute: ExecuteCommand;
}
