import type { CommandInteraction } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

import type { ICommand } from '../../structures/Command';

const Command: ICommand = {
  name: 'ping',
  category: 'general',

  slashCommandBuilder: new SlashCommandBuilder()
    .setName('ping')
    .setDescription("Check bot's connection to discord."),

  options: {},

  execute: async (bot, interaction: CommandInteraction) => {},
};

export default Command;
