/* eslint-disable no-param-reassign */
import { MessageEmbed } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

import type { ICommand } from '../../structures/Command';
import Emojis from '../../resources/Emojis';

const Command: ICommand = {
  name: 'partner',

  slashCommandBuilder: new SlashCommandBuilder()
    .setName('partner')
    .setDescription('Grant/revoke partner status to a user.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('grant')
        .setDescription('Grant partner status to a user.')
        .addUserOption((user) =>
          user
            .setName('user')
            .setDescription('The user to grant partner status to.')
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('revoke')
        .setDescription('Revoke partner status from a user.')
        .addUserOption((user) =>
          user
            .setName('user')
            .setDescription('The user to revoke partner status of.')
            .setRequired(true),
        ),
    ),

  options: {
    ownerOnly: true,
  },

  run: async (bot, interaction, user) => {
    const subcommand = interaction.options.getSubcommand();
    const target = interaction.options.getUser('user', true);

    const targetUser = await bot.userModel
      .findOne({
        id: target.id,
      })
      .exec();

    if (!targetUser) {
      await interaction.editReply(
        `${Emojis.cross} ${target.tag} not found in database.`,
      );
      return;
    }

    if (subcommand === 'grant' && targetUser.isPartner) {
      await interaction.editReply(
        `${Emojis.cross} ${target.tag} is already a partner.`,
      );
      return;
    }

    if (subcommand === 'revoke' && !targetUser.isPartner) {
      await interaction.editReply(
        `${Emojis.cross} ${target.tag} is not a partner.`,
      );
      return;
    }

    targetUser.isPartner = subcommand === 'grant';
    await targetUser.save();

    const embed = new MessageEmbed()
      .setAuthor({
        name: `${target.username}'s Partner Status`,
        iconURL: target.displayAvatarURL({ dynamic: true }),
      })
      .setDescription(
        `${subcommand === 'grant' ? 'Granted' : 'Revoked'} partner status ${
          subcommand === 'grant' ? 'to' : 'from'
        } **${target.tag}**`,
      )
      .setColor(bot._config.color)
      .setTimestamp();

    await interaction.editReply({
      embeds: [embed],
    });
  },
};

export default Command;
