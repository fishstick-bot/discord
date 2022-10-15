import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { Endpoints } from 'fnbr';

import type { ICommand } from '../../structures/Command';
import type { IEpicAccount } from '../../database/models/typings';
import Emojis from '../../resources/Emojis';
import StwDailyRewards from '../../resources/DailyRewards.json';

const Command: ICommand = {
  name: 'claim-daily',

  slashCommandBuilder: new SlashCommandBuilder()
    .setName('claim-daily')
    .setDescription('Claim your Save the World daily rewards'),

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

    const stw = await client.getSTWProfile(epicAccount.accountId);

    const tutorialCompleted =
      (stw!.items.find((i) => i.templateId === 'Quest:homebaseonboarding')
        ?.attributes.completion_hbonboarding_completezone ?? 0) > 0;

    if (!tutorialCompleted) {
      throw new Error(
        `You must complete your tutorial before you can view your stats.`,
      );
    }

    const res = await client.http.sendEpicgamesRequest(
      true,
      'POST',
      `${Endpoints.MCP}/${epicAccount.accountId}/client/ClaimLoginReward?profileId=campaign`,
      'fortnite',
      {
        'Content-Type': 'application/json',
      },
      {},
    );

    if (res.error) {
      throw new Error(res.error.message ?? res.error.code);
    }

    const { daysLoggedIn, items } = res.response.notifications[0];

    const multiplier: number = Math.ceil(daysLoggedIn / 336);
    let baseDay: number = daysLoggedIn;
    if (daysLoggedIn > 336) baseDay = daysLoggedIn - 336 * (multiplier - 1);

    const rewardsByDay: {
      [key: string]: any;
    } = {};
    // eslint-disable-next-line no-restricted-syntax
    for (const day in StwDailyRewards) {
      if (
        parseInt(day, 10) + 1 <= baseDay + 6 &&
        parseInt(day, 10) + 1 >= baseDay
      ) {
        rewardsByDay[336 * (multiplier - 1) + parseInt(day, 10) + 1] =
          StwDailyRewards[day];
      }
    }

    const alreadyClaimed = items.length === 0;

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${epicAccount.displayName}'s Daily Rewards`,
        iconURL: epicAccount.avatarUrl,
      })
      .setColor(bot._config.color)
      .setTimestamp().setDescription(`${Emojis.tick} **${
      epicAccount.displayName
    } (${daysLoggedIn} Days)**
${
  alreadyClaimed
    ? 'You have already claimed todays reward.'
    : 'Successfully claimed todays reward.'
}
Today - **${rewardsByDay[daysLoggedIn]?.amount ?? 0}x ${
      rewardsByDay[daysLoggedIn]?.name ?? 'Unknown Item'
    }**
Tomorrow - **${rewardsByDay[daysLoggedIn + 1]?.amount ?? 0}x ${
      rewardsByDay[daysLoggedIn + 1]?.name ?? 'Unknown Item'
    }**`);

    await interaction.editReply({
      content: ' ',
      embeds: [embed],
    });
  },
};

export default Command;
