import { EmbedBuilder, SlashCommandBuilder, version } from 'discord.js';
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
    const embed = new EmbedBuilder()
      .setAuthor({
        name: 'Fishstick Bot',
        iconURL: bot.user?.displayAvatarURL(),
      })
      .setTimestamp()
      .setColor(bot._config.color)
      .addFields([
        {
          name: '📁 Guilds',
          value: `${await bot.getGuildCount()}`,
          inline: true,
        },
      ])
      .addFields([
        {
          name: '👽 Users',
          value: `${approx(await bot.getApproxUserCount())}`,
          inline: true,
        },
      ])
      .addFields([
        {
          name: '⏳ Memory Usage',
          value: `**All Clusters**: ${(
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
          inline: true,
        },
      ])
      .addFields([
        {
          name: '⌚️ Uptime',
          value: `${ms(bot.uptime!, { long: true })}`,
          inline: true,
        },
      ])
      .addFields([
        { name: '👾 Discord.js', value: `v${version}`, inline: true },
      ])
      .addFields([
        {
          name: '🤖 CPU',
          value: `\`\`\`md\n${os.cpus().map((i) => `${i.model}`)[0]}\`\`\``,
          inline: false,
        },
      ])
      .addFields([{ name: '🤖 Arch', value: `\`${os.arch()}\``, inline: true }])
      .addFields([
        {
          name: '💻 Platform',
          value: `\`\`${os.platform()}\`\``,
          inline: true,
        },
      ])
      .addFields([
        { name: 'API Latency', value: `${bot.ws.ping}ms`, inline: true },
      ]);

    await interaction.editReply({
      embeds: [embed],
    });
  },
};

export default Command;
