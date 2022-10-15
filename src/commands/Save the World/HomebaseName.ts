import {
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ActionRowBuilder,
  Message,
  ModalBuilder,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { Endpoints } from 'fnbr';

import type { ICommand } from '../../structures/Command';
import type { IEpicAccount } from '../../database/models/typings';
import Emojis from '../../resources/Emojis';

const Command: ICommand = {
  name: 'homebase-name',

  slashCommandBuilder: new SlashCommandBuilder()
    .setName('homebase-name')
    .setDescription(
      'View / Change your Fortnite Save the World homebase name.',
    ),

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
      `${Endpoints.MCP}/${epicAccount.accountId}/client/QueryProfile?profileId=common_public`,
      'fortnite',
      {
        'Content-Type': 'application/json',
      },
      {},
    );

    if (res.error) {
      throw new Error(res.error.message ?? res.error.code);
    }

    const currentHomebaseName =
      res.response.profileChanges[0].profile.stats.attributes.homebase_name ??
      '';

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${epicAccount.displayName}'s STW Homebase`,
        iconURL: epicAccount.avatarUrl,
      })
      .setColor(bot._config.color)
      .setTimestamp()
      .setDescription(
        `Your current homebase name is: **${currentHomebaseName}**`,
      );

    const changeBtn = new ButtonBuilder()
      .setCustomId('changeHomebaseName')
      .setLabel('Change Your Homebase Name')
      .setStyle(ButtonStyle.Secondary);

    await interaction.editReply({
      content: ' ',
      embeds: [embed],
      components: [
        new ActionRowBuilder<ButtonBuilder>().setComponents(changeBtn),
      ],
    });

    const msg = (await interaction.fetchReply()) as Message;

    const selected = await msg
      .awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id,
        time: 60 * 1000,
      })
      .catch(() => null);

    if (!selected) {
      await interaction.editReply({
        components: [],
      });
      return;
    }

    const changeHomebaseNameModal = new ModalBuilder()
      .setCustomId('changeHomebaseNameModal')
      .setTitle('Change Your Homebase Name')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('homebaseNameInput')
            .setLabel('Homebase Name')
            .setPlaceholder('Enter your new homebase name')
            .setValue(currentHomebaseName)
            .setRequired(true)
            .setStyle(TextInputStyle.Short),
        ),
      );

    await selected.showModal(changeHomebaseNameModal);

    const modalSubmit = await selected
      .awaitModalSubmit({
        filter: (int) => int.user.id === interaction.user.id,
        time: 30 * 1000,
      })
      .catch(() => null);
    if (!modalSubmit) return;

    await modalSubmit.deferReply();

    const newHomebaseName =
      modalSubmit.fields.getTextInputValue('homebaseNameInput');

    await client.http.sendEpicgamesRequest(
      true,
      'POST',
      `${Endpoints.MCP}/${epicAccount.accountId}/client/SetHomebaseName?profileId=common_public`,
      'fortnite',
      {
        'Content-Type': 'application/json',
      },
      {
        homebaseName: newHomebaseName,
      },
    );

    await modalSubmit.editReply({
      content: `Successfully changed your homebase name to **${newHomebaseName}**`,
    });
  },
};

export default Command;
