/* eslint-disable no-case-declarations */
import { SlashCommandBuilder } from '@discordjs/builders';
import axios from 'axios';
import { MessageAttachment } from 'discord.js';

import type { ICommand } from '../../structures/Command';

const Command: ICommand = {
  name: 'shop',

  slashCommandBuilder: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('View current Fortnite Item Shop.')
    .addSubcommand((c) =>
      c
        .setName('br')
        .setDescription('View current Fortnite Battle Royale Item Shop.'),
    ),

  options: {},

  run: async (bot, interaction) => {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'br':
        const brShop = (
          await axios.get(
            `http://127.0.0.1:${bot._config.apiPort}/api/catalog/br`,
          )
        ).data;
        const shopImg = (
          await axios.get(
            `http://127.0.0.1:${bot._config.apiPort}/api/catalog/br/img/${brShop.date}.png`,
            {
              responseType: 'arraybuffer',
            },
          )
        ).data;

        await interaction.editReply({
          files: [new MessageAttachment(shopImg, `${brShop.date}.png`)],
        });
        break;

      case 'stw':
        await interaction.editReply('TODO');
        break;
    }
  },
};

export default Command;
