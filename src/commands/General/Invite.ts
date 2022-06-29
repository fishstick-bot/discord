import { MessageButton, MessageActionRow } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

import type { ICommand } from '../../structures/Command';

const Command: ICommand = {
  name: 'invite',
  category: "Get bot's invite link",

  slashCommandBuilder: new SlashCommandBuilder()
    .setName('invite')
    .setDescription("Check bot's invite link"),

  options: {},

  run: async (bot, interaction) => {
    const btn = new MessageButton()
      .setURL('https://fishstickbot.com/invite')
      .setLabel('Invite Me')
      .setStyle('LINK');

    await interaction.editReply({
      content: '**Invite me to your server!**',
      components: [new MessageActionRow().setComponents(btn)],
    });
  },
};

export default Command;
