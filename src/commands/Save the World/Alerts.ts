import {
  MessageActionRow,
  MessageButton,
  MessageEmbed,
  Message,
} from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import axios from 'axios';

import type { ICommand } from '../../structures/Command';
import type ISTWMission from '../../structures/STWMission';
import Emojis from '../../resources/Emojis';

const formatMissions = (missions: ISTWMission[]) =>
  missions
    .map(
      (m) => `• **[${m.powerLevel}] ${m.missionType}${
        m.show ? '' : ' (Hidden)'
      }**
${m.biome} - ${m.area}
${m.rewards
  .map(
    (r) =>
      `**${
        (Emojis as any)[r.id] ?? (Emojis as any)[r.name] ?? r.name
      } ${r.amount.toLocaleString()}x ${
        r.repeatable ? '' : ' (Alert Reward)'
      }**`,
  )
  .join('\n')}`,
    )
    .join('\n\n');

const Command: ICommand = {
  name: 'alerts',

  slashCommandBuilder: new SlashCommandBuilder()
    .setName('alerts')
    .setDescription('View Save the World Mission Alerts.')
    .addSubcommand((c) =>
      c.setName('vbucks').setDescription('View V-Bucks alerts.'),
    )
    .addSubcommand((c) =>
      c
        .setName('legendary-survivors')
        .setDescription('View Legendary Survivor alerts.'),
    )
    .addSubcommand((c) =>
      c.setName('view').setDescription('View all Mission Alerts.'),
    ),

  options: {},

  run: async (bot, interaction, user) => {
    const subCommand = interaction.options.getSubcommand();

    const embed = new MessageEmbed()
      .setColor(bot._config.color)
      .setTimestamp()
      .setTitle('Save the World Mission Alerts')
      .setAuthor({
        name: interaction.user.username,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
      });

    if (subCommand === 'vbucks') {
      const mtxAlerts = (
        await axios.get(
          `http://127.0.0.1:${bot._config.apiPort}/api/stwVbucksMissions`,
        )
      ).data as ISTWMission[];

      if (mtxAlerts.length === 0) {
        embed.setDescription(
          `No ${Emojis.vbucks} V-Bucks alerts are currently available.`,
        );
      } else {
        embed.setFooter({
          text: `${mtxAlerts
            .map(
              (m) =>
                m.rewards.find(
                  (r) => r.id === 'AccountResource:currency_mtxswap',
                )?.amount ?? 0,
            )
            .reduce((a, b) => a + b, 0)} V-Bucks today`,
        });
        embed.setDescription(formatMissions(mtxAlerts));
      }
    }

    if (subCommand === 'legendary-survivors') {
      const stwLegendarySurvivorAlerts = (
        await axios.get(
          `http://127.0.0.1:${bot._config.apiPort}/api/stwLegendarySurvivorMissions`,
        )
      ).data as ISTWMission[];

      if (stwLegendarySurvivorAlerts.length === 0) {
        embed.setDescription(
          `No ${Emojis.vbucks} Legendary Survivor alerts are currently available.`,
        );
      } else {
        embed.setFooter({
          text: `${stwLegendarySurvivorAlerts.length} Legendary Survivors today`,
        });
        embed.setDescription(formatMissions(stwLegendarySurvivorAlerts));
      }
    }

    if (subCommand === 'view') {
      embed.setDescription('TODO');
    }

    await interaction.editReply({
      embeds: [embed],
    });
  },
};

export default Command;
