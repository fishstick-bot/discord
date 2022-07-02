/* eslint-disable no-param-reassign */
import {
  MessageEmbed,
  MessageButton,
  MessageSelectMenu,
  Modal,
  TextInputComponent,
  MessageActionRow,
  ModalActionRowComponent,
  Message,
  MessageAttachment,
  SelectMenuInteraction,
} from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

import type { ICommand } from '../../structures/Command';
import type { IEpicAccount } from '../../database/models/typings';
import Emojis from '../../resources/Emojies';

const Command: ICommand = {
  name: 'account',

  slashCommandBuilder: new SlashCommandBuilder()
    .setName('account')
    .setDescription('Manage your Epic Games account.')
    .addSubcommandGroup((g) =>
      g
        .setName('token')
        .setDescription('Create/kill bearer token for your account.')
        .addSubcommand((c) =>
          c.setName('create').setDescription('Create a new bearer token.'),
        )
        .addSubcommand((c) =>
          c
            .setName('kill')
            .setDescription('Kill an active bearer token for your account.')
            .addStringOption((o) =>
              o
                .setName('token')
                .setDescription('The token to kill.')
                .setRequired(true),
            ),
        )
        .addSubcommand((c) =>
          c
            .setName('kill-all')
            .setDescription('Kill all active bearer tokens for your account.'),
        ),
    )
    .addSubcommand((c) =>
      c
        .setName('exchange-code')
        .setDescription('Create an exchange code for your account.'),
    )
    .addSubcommand((c) =>
      c
        .setName('page')
        .setDescription('Create an url to your Epic Games account page.'),
    )
    .addSubcommand((c) =>
      c
        .setName('authorization-code')
        .setDescription('Get authorization code for your account.')
        .addStringOption((o) =>
          o
            .setName('clientid')
            .setDescription(
              'The client id to use. Eg: 3446cd72694c4a4485d81b77adbb2141',
            )
            .setRequired(false),
        ),
    ),

  options: {
    privateResponse: true,
    needsEpicAccount: true,
  },

  run: async (bot, interaction, user) => {
    const subcmdgroup = interaction.options.getSubcommandGroup(false);
    const subcmd = interaction.options.getSubcommand();

    const epicAccount = (user.epicAccounts as IEpicAccount[]).find(
      (a) => a.accountId === user.selectedEpicAccount,
    );

    if (!epicAccount) {
      throw new Error(
        'You must have an Epic account logged in to use this command. Use `/login` to log in.',
      );
    }

    await interaction.editReply(`Connecting to Epic Games${Emojis.loading}`);

    await bot.fortniteManager.clientFromDeviceAuth(
      epicAccount.accountId,
      epicAccount.deviceId,
      epicAccount.secret,
    );

    const accountInfo = await bot.fortniteManager.getAccountInfo(
      epicAccount.accountId,
    );

    let res: any;
    if (subcmdgroup === 'token') {
      switch (subcmd) {
        case 'create':
          res = await bot.fortniteManager.createBearerToken(
            epicAccount.accountId,
            epicAccount.deviceId,
            epicAccount.secret,
          );

          await interaction.editReply(res);
          break;

        case 'kill':
          await bot.fortniteManager.killBearerToken(
            epicAccount.accountId,
            interaction.options.getString('token')!,
          );

          await interaction.editReply(`Bearer token killed.`);
          break;

        case 'kill-all':
          await bot.fortniteManager.killBearerToken(epicAccount.accountId);

          await interaction.editReply(`All active bearer tokens killed.`);
          break;
      }
    }

    if (subcmd === 'exchange-code' || subcmd === 'page') {
      const exchangeCode = await bot.fortniteManager.createExchangeCode(
        epicAccount.accountId,
      );

      const pageUrl = `https://epicgames.com/id/exchange?exchangeCode=${exchangeCode}`;

      await interaction.editReply(
        subcmd === 'exchange-code'
          ? exchangeCode
          : `Visit your account page **[here](${pageUrl})**.`,
      );
    }

    if (subcmd === 'authorization-code') {
      const clientId =
        interaction.options.getString('clientId') ||
        '3446cd72694c4a4485d81b77adbb2141';

      const authorizationCode =
        await bot.fortniteManager.createAuthorizationCode(
          epicAccount.accountId,
          clientId,
        );

      if (!authorizationCode) {
        throw new Error('Failed to create authorization code.');
      }

      await interaction.editReply(authorizationCode);
    }
  },
};

export default Command;
