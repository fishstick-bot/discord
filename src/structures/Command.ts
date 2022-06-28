import type { CommandInteraction } from 'discord.js';
import type { SlashCommandBuilder } from '@discordjs/builders';

import Bot from '../client/Client';

type ExecuteCommand = (
  bot: Bot,
  interaction: CommandInteraction,
) => Promise<void>;

interface CommandOptions {
  privateResponse?: boolean;

  premiumOnly?: boolean;
  partnerOnly?: boolean;
  ownerOnly?: boolean;
}

export interface ICommand {
  name: string;
  category: string;

  slashCommandBuilder: SlashCommandBuilder;

  options: CommandOptions;

  execute: ExecuteCommand;
}
