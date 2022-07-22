/* eslint-disable no-case-declarations */
import { SlashCommandBuilder } from '@discordjs/builders';
import axios from 'axios';

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
    )
    .addSubcommand((c) =>
      c
        .setName('stw')
        .setDescription('View current Fortnite Save the World Item Shop.'),
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

        await interaction.editReply(
          `https://fishstickbot.com/api/catalog/br/img/${brShop.date}.png`,
        );
        break;

      case 'stw':
        await interaction.editReply('TODO');
        break;
    }
  },
};

export default Command;
