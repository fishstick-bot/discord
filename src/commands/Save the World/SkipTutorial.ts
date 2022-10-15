import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { Endpoints } from 'fnbr';

import type { ICommand } from '../../structures/Command';
import type { IEpicAccount } from '../../database/models/typings';
import Emojis from '../../resources/Emojis';

const Command: ICommand = {
  name: 'skip-tutorial',

  slashCommandBuilder: new SlashCommandBuilder()
    .setName('skip-tutorial')
    .setDescription('Skip your Save the World game mode tutorial.'),

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

    if (tutorialCompleted) {
      throw new Error(`You have already completed your STW tutorial.`);
    }

    await client.http.sendEpicgamesRequest(
      true,
      'POST',
      `${Endpoints.MCP}/${epicAccount.accountId}/client/SkipTutorial?profileId=campaign`,
      'fortnite',
      {
        'Content-Type': 'application/json',
      },
      {},
    );

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${epicAccount.displayName}'s STW Tutorial`,
        iconURL: epicAccount.avatarUrl,
      })
      .setColor(bot._config.color)
      .setTimestamp()
      .setDescription('Successfully skipped tutorial.');

    await interaction.editReply({
      content: ' ',
      embeds: [embed],
    });
  },
};

export default Command;
