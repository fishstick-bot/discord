import { MessageButton, MessageActionRow } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

import type { ICommand } from '../../structures/Command';

const Command: ICommand = {
  name: 'vote',
  category: "Get bot's vote link",

  slashCommandBuilder: new SlashCommandBuilder()
    .setName('vote')
    .setDescription("Check bot's vote link"),

  options: {},

  run: async (bot, interaction) => {
    const btn = new MessageButton()
      .setURL('https://fishstickbot.com/vote')
      .setLabel('Vote for Me')
      .setStyle('LINK');

    await interaction.editReply({
      content: '**Vote for me on Top.GG!**',
      components: [new MessageActionRow().setComponents(btn)],
    });
  },
};

export default Command;
