/* eslint-disable no-param-reassign */
import {
  EmbedBuilder,
  AttachmentBuilder,
  SelectMenuBuilder,
  ActionRowBuilder,
  Message,
  SelectMenuInteraction,
  SlashCommandBuilder,
  time,
} from 'discord.js';
import { Endpoints } from 'fnbr';

import type { ICommand } from '../../structures/Command';
import type { IEpicAccount } from '../../database/models/typings';
import Emojis from '../../resources/Emojis';

const capitalFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

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
        .setDescription('Create / kill bearer token for your account.')
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
        .setName('launch')
        .setDescription(
          'Creates launch arguments to launch your fortnite account on Windows.',
        ),
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
    )
    .addSubcommand((c) =>
      c.setName('receipts').setDescription('Get your account receipts.'),
    )
    .addSubcommand((c) =>
      c
        .setName('externals')
        .setDescription(
          'View / unlink external connections to your epic account.',
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

    const client = await bot.fortniteManager.clientFromDeviceAuth(
      epicAccount.accountId,
      epicAccount.deviceId,
      epicAccount.secret,
    );
    await client.user?.fetch();

    const msg = (await interaction.fetchReply()) as Message;

    let res: any;
    if (subcmd === 'info') {
      const accountInfoEmbed = new EmbedBuilder()
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

    if (
      subcmd === 'exchange-code' ||
      subcmd === 'page' ||
      subcmd === 'launch'
    ) {
      const exchangeCode = await bot.fortniteManager.createExchangeCode(
        epicAccount.accountId,
      );

      const pageUrl = `https://epicgames.com/id/exchange?exchangeCode=${exchangeCode}`;

      await interaction.editReply(
        // eslint-disable-next-line no-nested-ternary
        subcmd === 'exchange-code'
          ? exchangeCode
          : subcmd === 'page'
          ? `Visit your account page **[here](${pageUrl})**.`
          : `Log in to Fortnite Windows as **${epicAccount.displayName}**
Copy and paste the text below into a Command Prompt window (cmd.exe) and hit enter. Valid for 5 minutes, until it's used, or until you log out.
\`\`\`bat
start /d "C:\\Program Files\\Epic Games\\Fortnite\\FortniteGame\\Binaries\\Win64" FortniteLauncher.exe -AUTH_LOGIN=unused -AUTH_PASSWORD=${exchangeCode} -AUTH_TYPE=exchangecode -epicapp=Fortnite -epicenv=Prod -EpicPortal -epicuserid=${epicAccount.accountId}
\`\`\``,
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

    if (subcmd === 'receipts') {
      const commoncore = await client.http.sendEpicgamesRequest(
        true,
        'POST',
        `${Endpoints.MCP}/${epicAccount.accountId}/client/QueryProfile?profileId=common_core`,
        'fortnite',
        { 'Content-Type': 'application/json' },
        {},
      );

      if (commoncore.error) {
        throw new Error(commoncore.error.message ?? commoncore.error.code);
      }

      const receipts = new AttachmentBuilder(
        Buffer.from(
          (
            commoncore.response?.profileChanges[0]?.profile?.stats?.attributes
              ?.in_app_purchases?.receipts ?? []
          ).join('\n'),
        ),
        { name: `receipts_${epicAccount.accountId}.txt` },
      );

      await interaction.editReply({
        files: [receipts],
        content: `**${epicAccount.displayName}'s Receipts**`,
      });
    }

    if (subcmd === 'externals') {
      const externals = await client.http.sendEpicgamesRequest(
        true,
        'GET',
        `${Endpoints.ACCOUNT_ID}/${epicAccount.accountId}/externalAuths`,
        'fortnite',
      );

      if (externals.error) {
        throw new Error(externals.error.message ?? externals.error.code);
      }

      const externalAuths = externals.response ?? [];

      if (externalAuths.length === 0) {
        throw new Error(
          'No external accounts are connected to this epic account.',
        );
      }

      const externalsEmbed = new EmbedBuilder()
        .setAuthor({
          name: `${epicAccount.displayName}'s External Auths`,
          iconURL: epicAccount.avatarUrl,
        })
        .setColor(bot._config.color)
        .setTimestamp()
        .setDescription(
          externalAuths
            .map(
              (a: any) =>
                `• **${capitalFirst(a.type)}**: ${
                  a.externalDisplayName
                } - Added ${time(new Date(a.dateAdded), 'd')}`,
            )
            .join('\n'),
        );

      const externalUnlinkOptions = new SelectMenuBuilder()
        .setCustomId('externalUnlink')
        .setPlaceholder('Select an External Account to Unlink.')
        .setOptions(
          externalAuths.map((a: any) => ({
            value: a.type,
            label: capitalFirst(a.type),
            description: a.externalDisplayName,
          })),
        );

      await interaction.editReply({
        content: ' ',
        embeds: [externalsEmbed],
        components: [
          new ActionRowBuilder<SelectMenuBuilder>().setComponents(
            externalUnlinkOptions,
          ),
        ],
      });

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

      await client.http.sendEpicgamesRequest(
        true,
        'DELETE',
        `${Endpoints.ACCOUNT_ID}/${epicAccount.accountId}/externalAuths/${
          (selected as SelectMenuInteraction).values[0]
        }`,
        'fortnite',
      );

      await interaction.editReply({
        content: `**Successfully unlinked ${
          (selected as SelectMenuInteraction).values[0]
        } from your external connections.**`,
        embeds: [externalsEmbed],
        components: [],
      });
    }
  },
};

export default Command;
