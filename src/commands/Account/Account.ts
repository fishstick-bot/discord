/* eslint-disable no-param-reassign */
import { MessageEmbed } from 'discord.js';
import { SlashCommandBuilder, time } from '@discordjs/builders';
import { Endpoints } from 'fnbr';

import type { ICommand } from '../../structures/Command';
import type { IEpicAccount } from '../../database/models/typings';
import Emojis from '../../resources/Emojies';

const Command: ICommand = {
  name: 'account',

  slashCommandBuilder: new SlashCommandBuilder()
    .setName('account')
    .setDescription('Manage your Epic Games account.')
    .addSubcommand((c) =>
      c
        .setName('info')
        .setDescription('View your Epic Games account information.'),
    )
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
    )
    .addSubcommand((c) =>
      c.setName('2fa').setDescription('Claim your 2FA rewards.'),
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

    const client = await bot.fortniteManager.clientFromDeviceAuth(
      epicAccount.accountId,
      epicAccount.deviceId,
      epicAccount.secret,
    );
    await client.user?.fetch();

    let res: any;
    if (subcmd === 'info') {
      const accountInfoEmbed = new MessageEmbed()
        .setAuthor({
          name: `${epicAccount.displayName}'s Account Information`,
          iconURL: epicAccount.avatarUrl,
        })
        .setTimestamp()
        .setColor(bot._config.color)
        .setDescription(
          `• **Account ID**: ${epicAccount.accountId}
• **Epic Name**: ${client.user!.displayName}
• **Real Name**: ${client.user!.name} ${client.user?.lastName}
• **Email**: ${client.user!.email} ${
            client.user?.emailVerified ? Emojis.tick : Emojis.cross
          }
• **2FA Enabled**: ${client.user?.tfaEnabled ? 'Yes' : 'No'}
• **Country**: ${client.user?.country}

• **Last Login**: ${time(client.user?.lastLogin)}`,
        );

      await interaction.editReply({
        content: ' ',
        embeds: [accountInfoEmbed],
      });
    }

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

    if (subcmd === '2fa') {
      const athena = await client.http.sendEpicgamesRequest(
        true,
        'POST',
        `${Endpoints.MCP}/${epicAccount.accountId}/client/QueryProfile?profileId=athena`,
        'fortnite',
        { 'Content-Type': 'application/json' },
        {},
      );

      const campaign = await client.http.sendEpicgamesRequest(
        true,
        'POST',
        `${Endpoints.MCP}/${epicAccount.accountId}/client/QueryProfile?profileId=campaign`,
        'fortnite',
        { 'Content-Type': 'application/json' },
        {},
      );

      if (athena.error) {
        throw new Error(athena.error.message ?? athena.error.code);
      }

      const brMfaClaimed =
        athena.response.profileChanges[0].profile.stats.attributes
          .mfa_reward_claimed;
      const campaignMfaClaimed =
        campaign.response?.profileChanges[0].profile.stats.attributes
          .mfa_reward_claimed ?? false;

      if (brMfaClaimed || campaignMfaClaimed) {
        await interaction.editReply(
          `You have already claimed your 2FA rewards.`,
        );
        return;
      }

      const claimMfa = await client.http.sendEpicgamesRequest(
        true,
        'POST',
        `${Endpoints.MCP}/${epicAccount.accountId}/client/ClaimMfaEnabled?profileId=common_core`,
        'fortnite',
        { 'Content-Type': 'application/json' },
        {
          bClaimForStw: !campaignMfaClaimed && !campaign.error,
        },
      );

      if (claimMfa.error) {
        throw new Error(claimMfa.error.message ?? claimMfa.error.code);
      }

      const { profileRevision } = claimMfa.response;
      const { profileChangesBaseRevision } = claimMfa.response;

      if (profileRevision < profileChangesBaseRevision) {
        throw new Error(
          'Failed to claim 2fa Rewards.\nPlease make sure that you already have two-factor authentication enabled on your account prior to attempting to claim the rewards.',
        );
      }

      await interaction.editReply(
        `Successfully claimed 2FA rewards for **${epicAccount.displayName}**.`,
      );
    }
  },
};

export default Command;
