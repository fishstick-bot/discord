/* eslint-disable no-param-reassign */
import { MessageEmbed } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

import type { ICommand } from '../../structures/Command';
import Emojis from '../../resources/Emojis';

const Command: ICommand = {
  name: 'autosac',

  slashCommandBuilder: new SlashCommandBuilder()
    .setName('autosac')
    .setDescription('Add/remove a user from autosac system of bot.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('Add a user to autosac.')
        .addUserOption((user) =>
          user
            .setName('user')
            .setDescription('The user to add to autosac.')
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription('Remove a user from autosac.')
        .addUserOption((user) =>
          user
            .setName('user')
            .setDescription('The user to remove from autosac.')
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

    if (subcommand === 'add' && !targetUser.noAutoSac) {
      await interaction.editReply(
        `${Emojis.cross} ${target.tag} is already autosac.`,
      );
      return;
    }

    if (subcommand === 'remove' && targetUser.noAutoSac) {
      await interaction.editReply(
        `${Emojis.cross} ${target.tag} is not autosac.`,
      );
      return;
    }

    targetUser.noAutoSac = subcommand === 'remove';
    await targetUser.save();

    const embed = new MessageEmbed()
      .setAuthor({
        name: `${target.username}'s Auto SAC Status`,
        iconURL: target.displayAvatarURL({ dynamic: true }),
      })
      .setDescription(
        `${subcommand === 'add' ? 'Added' : 'Removed'} **${target.tag}** ${
          subcommand === 'add' ? 'to' : 'from'
        } the autosac.`,
      )
      .setColor(bot._config.color)
      .setTimestamp();

    await interaction.editReply({
      embeds: [embed],
    });
  },
};

export default Command;
