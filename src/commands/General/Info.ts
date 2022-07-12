import { MessageEmbed, version } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import ms from 'ms';
import os from 'os';
// @ts-ignore
import approx from 'approximate-number';

import type { ICommand } from '../../structures/Command';

const Command: ICommand = {
  name: 'info',

  slashCommandBuilder: new SlashCommandBuilder()
    .setName('info')
    .setDescription("Check bot's info"),

  options: {},

  run: async (bot, interaction) => {
    const embed = new MessageEmbed()
      .setAuthor({
        name: 'Fishstick Bot',
        iconURL: bot.user?.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp()
      .setColor(bot._config.color)
      .addField('📁 Guilds', `${await bot.getGuildCount()}`, true)
      .addField('👽 Users', `${approx(await bot.getApproxUserCount())}`, true)
      .addField(
        '⏳ Memory Usage',
        `**All Clusters**: ${(
          (await bot.cluster.broadcastEval(
            `(process.memoryUsage().heapUsed/1024/1024)`,
          )) as number[]
        )
          .reduce((prev: number, value: number) => Number(prev + value), 0)
          .toFixed(2)} / ${(os.totalmem() / 1024 / 1024).toFixed(
          2,
        )} MB\n**Current Cluster**: ${(
          process.memoryUsage().heapUsed /
          1024 /
          1024
        ).toFixed(2)} / ${(os.totalmem() / 1024 / 1024).toFixed(2)} MB`,
        true,
      )
      .addField('⌚️ Uptime', `${ms(bot.uptime!, { long: true })}`, true)
      .addField('👾 Discord.js', `v${version}`, true)
      .addField(
        '🤖 CPU',
        `\`\`\`md\n${os.cpus().map((i) => `${i.model}`)[0]}\`\`\``,
        false,
      )
      .addField('🤖 Arch', `\`${os.arch()}\``, true)
      .addField('💻 Platform', `\`\`${os.platform()}\`\``, true)
      .addField('API Latency', `${bot.ws.ping}ms`, true);

    await interaction.editReply({
      embeds: [embed],
    });
  },
};

export default Command;
