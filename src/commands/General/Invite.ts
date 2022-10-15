import {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  SlashCommandBuilder,
} from 'discord.js';

import type { ICommand } from '../../structures/Command';

const Command: ICommand = {
  name: 'invite',

  slashCommandBuilder: new SlashCommandBuilder()
    .setName('invite')
    .setDescription("Check bot's invite link"),

  options: {},

  run: async (bot, interaction) => {
    const btn = new ButtonBuilder()
      .setURL('https://fishstickbot.com/invite')
      .setLabel('Invite Me')
      .setStyle(ButtonStyle.Link);

    await interaction.editReply({
      content: '**Invite me to your server!**',
      components: [new ActionRowBuilder<ButtonBuilder>().setComponents(btn)],
    });
  },
};

export default Command;
