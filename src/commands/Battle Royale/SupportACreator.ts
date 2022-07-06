import {
  MessageActionRow,
  MessageButton,
  MessageEmbed,
  Message,
  Modal,
  ModalActionRowComponent,
  TextInputComponent,
} from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { Client, Endpoints } from 'fnbr';

import type { ICommand } from '../../structures/Command';
import type { IEpicAccount } from '../../database/models/typings';
import Emojis from '../../resources/Emojis';

const Command: ICommand = {
  name: 'sac',

  slashCommandBuilder: new SlashCommandBuilder()
    .setName('sac')
    .setDescription('View / Change your Supported Creator in Item Shop.'),

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

    const commoncore = await client.http.sendEpicgamesRequest(
      true,
      'POST',
      `${Endpoints.MCP}/${epicAccount.accountId}/client/QueryProfile?profileId=common_core`,
      'fortnite',
      {
        'Content-Type': 'application/json',
      },
      {},
    );

    if (commoncore.error) {
      throw new Error(commoncore.error.message ?? commoncore.error.code);
    }

    const currentSac =
      commoncore.response?.profileChanges[0]?.profile?.stats.attributes
        .mtx_affiliate;

    const embed = new MessageEmbed()
      .setAuthor({
        name: `${epicAccount.displayName}'s Supported Creator`,
        iconURL: epicAccount.avatarUrl,
      })
      .setColor(bot._config.color)
      .setTimestamp()
      .setDescription(
        !currentSac || currentSac.length === 0
          ? 'You are not supporting any creator currently.'
          : `You are currently supporting **${currentSac}**`,
      );

    const updateSACBtn = new MessageButton()
      .setCustomId('updateSAC')
      .setLabel('Change Supported Creator')
      .setStyle('SECONDARY');

    const clearSacBtn = new MessageButton()
      .setCustomId('clearSac')
      .setLabel('Clear Supported Creator')
      .setStyle('DANGER');

    await interaction.editReply({
      content: ' ',
      embeds: [embed],
      components: [
        new MessageActionRow().setComponents(updateSACBtn, clearSacBtn),
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

    switch (selected.customId) {
      case 'updateSAC':
        // eslint-disable-next-line no-case-declarations
        const changeSacModal = new Modal()
          .setCustomId('changeSacModal')
          .setTitle('Change Your Supported Creator')
          .addComponents(
            new MessageActionRow<ModalActionRowComponent>().addComponents(
              new TextInputComponent()
                .setCustomId('sacInput')
                .setLabel('Creator Code')
                .setPlaceholder('Enter creator name you want to support')
                .setValue(currentSac ?? '')
                .setRequired(true)
                .setStyle('SHORT'),
            ),
          );

        await selected.showModal(changeSacModal);

        // eslint-disable-next-line no-case-declarations
        const modalSubmit = await selected
          .awaitModalSubmit({
            filter: (int) => int.user.id === interaction.user.id,
            time: 30 * 1000,
          })
          .catch(() => null);
        if (!modalSubmit) return;

        await modalSubmit.deferUpdate();

        // eslint-disable-next-line no-case-declarations
        const newSAC = modalSubmit.fields.getTextInputValue('sacInput');

        // eslint-disable-next-line no-case-declarations
        const setSac = await client.http.sendEpicgamesRequest(
          true,
          'POST',
          `${Endpoints.MCP}/${epicAccount.accountId}/client/SetAffiliateName?profileId=common_core`,
          'fortnite',
          {
            'Content-Type': 'application/json',
          },
          {
            affiliateName: newSAC,
          },
        );

        if (setSac.error) {
          throw new Error(setSac.error.message ?? setSac.error.code);
        }

        await interaction.editReply({
          content: `Your Supported Creator has been changed to **${newSAC}**`,
          embeds: [],
          components: [],
        });
        break;

      case 'clearSac':
        // eslint-disable-next-line no-case-declarations
        const clearSac = await client.http.sendEpicgamesRequest(
          true,
          'POST',
          `${Endpoints.MCP}/${epicAccount.accountId}/client/SetAffiliateName?profileId=common_core`,
          'fortnite',
          {
            'Content-Type': 'application/json',
          },
          {
            affiliateName: '',
          },
        );

        if (clearSac.error) {
          throw new Error(clearSac.error.message ?? clearSac.error.code);
        }

        await interaction.editReply({
          content:
            'Your Supported Creator has been cleared. You are not supporting any creator now.',
          embeds: [],
          components: [],
        });
        break;
    }
  },
};

export default Command;
