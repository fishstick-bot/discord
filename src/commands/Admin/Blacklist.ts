/* eslint-disable no-param-reassign */
import { MessageEmbed } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

import type { ICommand } from '../../structures/Command';
import Emojis from '../../resources/Emojis';

const Command: ICommand = {
  name: 'blacklist',

  slashCommandBuilder: new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('Add/remove a user from the blacklist.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('Add a user to blacklist.')
        .addUserOption((user) =>
          user
            .setName('user')
            .setDescription('The user to add to blacklist.')
            .setRequired(true),
        )
        .addStringOption((string) =>
          string
            .setName('reason')
            .setDescription('The reason for blacklisting the user.')
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription('Remove a user from blacklist.')
        .addUserOption((user) =>
          user
            .setName('user')
            .setDescription('The user to remove from blacklist.')
            .setRequired(true),
        ),
    ),

  options: {
    ownerOnly: true,
  },

  run: async (bot, interaction, user) => {
    const subcommand = interaction.options.getSubcommand();
    const target = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason');

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

    if (subcommand === 'add' && targetUser.blacklisted) {
      await interaction.editReply(
        `${Emojis.cross} ${target.tag} is already blacklisted.`,
      );
      return;
    }

    if (subcommand === 'remove' && !targetUser.blacklisted) {
      await interaction.editReply(
        `${Emojis.cross} ${target.tag} is not blacklisted.`,
      );
      return;
    }

    targetUser.blacklisted = subcommand === 'add';
    if (subcommand === 'add') {
      targetUser.blacklistedAt = new Date();
      if (reason) {
        targetUser.blacklistedReason = reason;
      }
    } else {
      targetUser.blacklistedAt = undefined;
      targetUser.blacklistedReason = undefined;
    }
    await targetUser.save();

    const embed = new MessageEmbed()
      .setAuthor({
        name: `${target.username}'s Blacklist Status`,
        iconURL: target.displayAvatarURL({ dynamic: true }),
      })
      .setDescription(
        `${subcommand === 'add' ? 'Added' : 'Removed'} **${target.tag}** ${
          subcommand === 'add' ? 'to' : 'from'
        } the blacklist.`,
      )
      .setColor(bot._config.color)
      .setTimestamp();

    await interaction.editReply({
      embeds: [embed],
    });
  },
};

export default Command;
