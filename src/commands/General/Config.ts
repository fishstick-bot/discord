/* eslint-disable no-param-reassign */
import {
  EmbedBuilder,
  SlashCommandBuilder,
  channelMention,
  PermissionFlagsBits,
} from 'discord.js';
import { ChannelType } from 'discord-api-types/v10';

import type { ICommand } from '../../structures/Command';
import Emojis from '../../resources/Emojis';

const Command: ICommand = {
  name: 'config',

  slashCommandBuilder: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Update your server config.')
    .addSubcommand((c) =>
      c
        .setName('itemshop')
        .setDescription('Setup auto post item shop in your server.')
        .addChannelOption((o) =>
          o
            .setName('channel')
            .setDescription('Channel to post item shop to.')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        ),
    )
    .addSubcommand((c) =>
      c
        .setName('vbucks-alerts')
        .setDescription('Setup auto post vbucks alerts in your server.')
        .addChannelOption((o) =>
          o
            .setName('channel')
            .setDescription('Channel to post vbucks alerts to.')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        ),
    )
    .addSubcommand((c) =>
      c
        .setName('legendary-survivor-alerts')
        .setDescription('Setup auto post legendary survivor in your server.')
        .addChannelOption((o) =>
          o
            .setName('channel')
            .setDescription('Channel to post legendary survivor alerts to.')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        ),
    ),

  options: {
    guildOnly: true,
  },

  run: async (bot, interaction, user, guild) => {
    const subcmd = interaction.options.getSubcommand();
    const channel = interaction.options.getChannel('channel');

    if (!interaction.memberPermissions!.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.editReply(
        'You do not have permission to manage this server.',
      );
      return;
    }

    switch (subcmd) {
      case 'itemshop':
        guild!.itemShopChannelId = channel!.id;
        break;

      case 'vbucks-alerts':
        guild!.vbucksAlertsChannelId = channel!.id;
        break;

      case 'legendary-survivor-alerts':
        guild!.legendarySurvivorAlertsChannelId = channel!.id;
        break;
    }
    await guild!.save();

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${interaction.guild!.name}'s Config`,
        iconURL: interaction.guild!.iconURL() ?? undefined,
      })
      .setColor(bot._config.color)
      .setTimestamp()
      .setFooter({
        text: `Guild ID: ${guild!.id}`,
      })
      .setDescription(
        `• Auto Post Item Shop Channel: ${
          guild!.itemShopChannelId !== ''
            ? channelMention(guild!.itemShopChannelId)
            : 'None'
        }
• Auto Post V-Bucks Alerts Channel: ${
          guild!.vbucksAlertsChannelId !== ''
            ? channelMention(guild!.vbucksAlertsChannelId)
            : 'None'
        }
• Auto Post Legendary Survivor Alerts Channel: ${
          guild!.legendarySurvivorAlertsChannelId !== ''
            ? channelMention(guild!.legendarySurvivorAlertsChannelId)
            : 'None'
        }`,
      );

    await interaction.editReply({
      content: `Updated ${interaction.guild!.name}'s config.`,
      embeds: [embed],
    });
  },
};

export default Command;
