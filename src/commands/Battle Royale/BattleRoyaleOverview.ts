import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { Endpoints } from 'fnbr';

import type { ICommand } from '../../structures/Command';
import type { IEpicAccount } from '../../database/models/typings';
import Emojis from '../../resources/Emojis';

const Command: ICommand = {
  name: 'br',

  slashCommandBuilder: new SlashCommandBuilder()
    .setName('br')
    .setDescription('View your Battle Royale profile overview.'),

  options: {
    needsEpicAccount: true,
  },

  run: async (bot, interaction, user) => {
    const epicAccount = (user.epicAccounts as IEpicAccount[]).find(
      (a) => a.accountId === user.selectedEpicAccount,
    );

    if (!epicAccount) {
      throw new Error(
        'You must have an Epic account logged in to use this command. Use `/login` to log in.',
      );
    }

    await interaction.editReply(`Connecting to Epic Games${Emojis.loading}`);

    const client = await bot.fortniteManager.clientFromDeviceAuth(
      epicAccount.accountId,
      epicAccount.deviceId,
      epicAccount.secret,
    );

    const promises = await Promise.all([
      await client.http.sendEpicgamesRequest(
        true,
        'POST',
        `${Endpoints.MCP}/${epicAccount.accountId}/client/QueryProfile?profileId=athena`,
        'fortnite',
        {
          'Content-Type': 'application/json',
        },
        {},
      ),
      await client.http.sendEpicgamesRequest(
        true,
        'GET',
        `https://fortnite-public-service-prod11.ol.epicgames.com/fortnite/api/game/v2/br-inventory/account/${epicAccount.accountId}`,
        'fortnite',
      ),
    ]);
    const br = promises[0];
    const gold = promises[1]?.response?.stash?.globalcash ?? 0;

    if (br.error) {
      throw new Error(br.error.message ?? br.error.code);
    }

    const stats = br.response?.profileChanges[0]?.profile?.stats.attributes;
    const lastMatch = stats.last_match_end_datetime;
    const seasonNum = stats.season_num;

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${epicAccount.displayName}'s Battle Royale Overview`,
        iconURL: epicAccount.avatarUrl,
      })
      .setColor(bot._config.color)
      .setTimestamp()
      .setDescription(
        `• Account Level - **${(stats.accountLevel ?? 0).toLocaleString()}**`,
      );

    if (lastMatch) {
      embed.setTimestamp(new Date(lastMatch)).setFooter({
        text: 'Last match end',
      });
    }

    if (seasonNum) {
      embed.addFields([
        {
          name: `Season ${seasonNum} Info`,
          value: `• ${
            stats.book_purchased ? 'Battle' : 'Free'
          } Pass Level - **${(stats.level ?? 0).toLocaleString()}**`,
        },
      ]);
    }

    embed.addFields([
      {
        name: 'Supercharged XP',
        value: `• XP - **${(stats.rested_xp ?? 0).toLocaleString()} / 162,000**
• Multiplier - **${stats.rested_xp_mult ?? 0}**
• Exchange - **${stats.rested_xp_exchange ?? 0}**
• Overflow - **${(stats.rested_xp_overflow ?? 0).toLocaleString()}**`,
      },
    ]);

    embed.addFields([
      {
        name: 'Seasonal Resources',
        value: `• ${Emojis.star} Battle Stars - **${
          stats.battlestars ?? 0
        } (Total - ${stats.battlestars_season_total ?? 0})**
• ${Emojis.brgold} Gold - **${gold.toLocaleString()}**`,
      },
    ]);

    await interaction.editReply({
      content: ' ',
      embeds: [embed],
    });
  },
};

export default Command;
