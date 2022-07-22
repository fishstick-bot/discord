/* eslint-disable no-case-declarations */
import {
  MessageActionRow,
  MessageSelectMenu,
  MessageButton,
  MessageEmbed,
} from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import axios from 'axios';
// @ts-ignore
import approx from 'approximate-number';

import type { ICommand } from '../../structures/Command';
import type { IEpicAccount } from '../../database/models/typings';
import Emojis from '../../resources/Emojis';

const Command: ICommand = {
  name: 'shop',

  slashCommandBuilder: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Buy from Fortnite Item Shop.')
    .addSubcommand((c) =>
      c
        .setName('br')
        .setDescription('Buy from Fortnite Battle Royale Item Shop.'),
    )
    .addSubcommand((c) =>
      c
        .setName('stw')
        .setDescription('Buy from Fortnite Save the World Item Shop.'),
    ),

  options: {
    needsEpicAccount: true,
  },

  run: async (bot, interaction, user) => {
    const subcommand = interaction.options.getSubcommand();

    const epicAccount = (user.epicAccounts as IEpicAccount[]).find(
      (a) => a.accountId === user.selectedEpicAccount,
    );

    if (!epicAccount) {
      throw new Error(
        'You must have an Epic account logged in to use this command. Use `/login` to log in.',
      );
    }

    let embed: MessageEmbed;
    switch (subcommand) {
      case 'br':
        const brShop = (
          await axios.get(
            `http://127.0.0.1:${bot._config.apiPort}/api/catalog/br`,
          )
        ).data;
        const brShopItems: any[] = brShop.data;

        if (brShopItems.length === 0) {
          await interaction.editReply(
            'There are no items in the Battle Royale Item Shop.',
          );
          return;
        }

        const components: MessageActionRow[] = [];
        for (let i = 0; i < brShopItems.length; i += 25) {
          components.push(
            new MessageActionRow().addComponents(
              new MessageSelectMenu()
                .setCustomId(`br-shop-${i}`)
                .setPlaceholder(`Shop Menu ${Math.floor(i / 25) + 1}`)
                .addOptions(
                  brShopItems.slice(i, i + 25).map((item) => ({
                    label: item.displayName,
                    description: `Price: ${approx(
                      item.price.finalPrice,
                    )} V-Bucks`,
                    value: item.offerId,
                    emoji: Emojis.vbucks,
                  })),
                )
                .setMaxValues(1),
            ),
          );
        }

        embed = new MessageEmbed()
          .setAuthor({
            name: `${epicAccount.displayName}'s Battle Royale Item Shop`,
            iconURL: epicAccount.avatarUrl,
          })
          .setColor(bot._config.color)
          .setTimestamp()
          .setDescription(
            `To buy an item, select it from the menu.

**This message will timeout in 60 seconds.**`,
          )
          .setImage(
            `https://fishstickbot.com/api/catalog/br/img/${brShop.date}.png`,
          );

        await interaction.editReply({
          components,
        });
        break;

      case 'stw':
        await interaction.editReply('TODO');
        break;
    }
  },
};

export default Command;
