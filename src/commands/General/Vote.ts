import {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  SlashCommandBuilder,
} from 'discord.js';

import type { ICommand } from '../../structures/Command';

const Command: ICommand = {
  name: 'vote',

  slashCommandBuilder: new SlashCommandBuilder()
    .setName('vote')
    .setDescription("Check bot's vote link"),

  options: {},

  run: async (bot, interaction) => {
    const btn = new ButtonBuilder()
      .setURL('https://fishstickbot.com/vote')
      .setLabel('Vote for Me')
      .setStyle(ButtonStyle.Link);

    await interaction.editReply({
      content: '**Vote for me on Top.GG!**',
      components: [new ActionRowBuilder<ButtonBuilder>().setComponents(btn)],
    });
  },
};

export default Command;
