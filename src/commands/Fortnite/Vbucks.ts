import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Message,
  SlashCommandBuilder,
} from 'discord.js';
import { Client, Endpoints } from 'fnbr';

import type { ICommand } from '../../structures/Command';
import type { IEpicAccount } from '../../database/models/typings';
import Emojis from '../../resources/Emojis';

const getVBucksData = async (client: Client, accountId: string) => {
  const commoncore = await client.http.sendEpicgamesRequest(
    true,
    'POST',
    `${Endpoints.MCP}/${accountId}/client/QueryProfile?profileId=common_core`,
    'fortnite',
    {
      'Content-Type': 'application/json',
    },
    {},
  );

  if (commoncore.error) {
    throw new Error(commoncore.error.message ?? commoncore.error.code);
  }

  const vbucksItems = Object.values(
    commoncore.response?.profileChanges[0]?.profile?.items,
  ).filter((i: any) => i.templateId.startsWith('Currency:Mtx')) as any[];

  const vTypes: {
    [key: string]: string;
  } = {
    MtxComplimentary: 'STW/Refunds',
    MtxGiveaway: 'Challenges/Battle Pass',
    MtxPurchased: 'Purchased',
    MtxPurchaseBonus: 'Purchase Bonus',
  };
  const vPlatforms: {
    [key: string]: string;
  } = {
    Live: 'Xbox',
    PSN: 'Playstation',
  };

  let total = 0;
  const vbucks: {
    [key: string]: number;
  } = {};
  // eslint-disable-next-line no-restricted-syntax
  for (const v of vbucksItems) {
    let type: string = vTypes[v.templateId.split(':')[1]]
      ? vTypes[v.templateId.split(':')[1]]
      : v.templateId;
    if (Object.keys(vPlatforms).includes(v.attributes.platform)) {
      type = `${vPlatforms[v.attributes.platform]} ${type}`;
    }
    vbucks[type] = v.quantity;
    total += v.quantity;
  }

  let totalPurchased = 0;
  // eslint-disable-next-line no-restricted-syntax
  for (const i in commoncore.response?.profileChanges[0]?.profile?.stats
    .attributes.in_app_purchases?.fulfillmentCounts ?? {}) {
    // eslint-disable-next-line no-continue
    if (!i.startsWith('FN_')) continue;

    totalPurchased +=
      parseInt(i.split('_')[1], 10) *
      (commoncore.response?.profileChanges[0]?.profile?.stats.attributes
        .in_app_purchases?.fulfillmentCounts[i] ?? 0);
  }

  return {
    total,
    breakdown: vbucks,
    platform:
      commoncore.response?.profileChanges[0]?.profile?.stats.attributes
        .current_mtx_platform ?? 'EpicPC',
    totalPurchased,
  };
};

const Command: ICommand = {
  name: 'vbucks',

  slashCommandBuilder: new SlashCommandBuilder()
    .setName('vbucks')
    .setDescription("View your saved account's V-bucks balance.")
    .addBooleanOption((o) =>
      o
        .setName('bulk')
        .setDescription('View balance of all your saved accounts at once.'),
    ),

  options: {
    needsEpicAccount: true,
  },

  run: async (bot, interaction, user) => {
    const bulk = interaction.options.getBoolean('bulk') ?? false;

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

    let embed: EmbedBuilder;
    const components: any[] = [];
    if (bulk) {
      embed = new EmbedBuilder()
        .setAuthor({
          name: `${interaction.user.tag}'s Saved Accounts V-Bucks Balances`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setColor(bot._config.color)
        .setTimestamp();

      const promises = (user.epicAccounts as IEpicAccount[]).map(async (a) => ({
        displayName: a.displayName,
        vbucksData: await getVBucksData(
          await bot.fortniteManager.clientFromDeviceAuth(
            a.accountId,
            a.deviceId,
            a.secret,
          ),
          a.accountId,
        ),
      }));
      const responses = await Promise.all(promises);

      embed.setDescription(
        responses
          .map(
            (r) =>
              `**${r.displayName} - ${
                Emojis.vbucks
              } ${r.vbucksData.total.toLocaleString()}**
${Object.keys(r.vbucksData.breakdown)
  .map((k) => `• **${r.vbucksData.breakdown[k]!.toLocaleString()}** - ${k}`)
  .join('\n')}`,
          )
          .join('\n\n'),
      );
    } else {
      const epicAccMtxData = await getVBucksData(client, epicAccount.accountId);

      embed = new EmbedBuilder()
        .setAuthor({
          name: `${epicAccount.displayName}'s V-Bucks Balance`,
          iconURL: epicAccount.avatarUrl,
        })
        .setColor(bot._config.color)
        .setTimestamp()
        .setDescription(
          `• Current V-Bucks Platform: **${epicAccMtxData.platform}**

**Overall - ${Emojis.vbucks} ${epicAccMtxData.total.toLocaleString()}**
${Object.keys(epicAccMtxData.breakdown)
  .map((k) => `• **${epicAccMtxData.breakdown[k]!.toLocaleString()}** - ${k}`)
  .join('\n')}`,
        )
        .setFooter({
          text: `Total Purchased V-Bucks: ${epicAccMtxData.totalPurchased}`,
        });

      const updatePlatformBtn = new ButtonBuilder()
        .setCustomId('updatePlatform')
        .setLabel('Update V-Bucks Platform')
        .setStyle(ButtonStyle.Secondary);

      components.push(new ActionRowBuilder().setComponents(updatePlatformBtn));
    }

    await interaction.editReply({
      content: ' ',
      embeds: [embed],
      components,
    });

    if (bulk) return;

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

    const mtxPlatforms: {
      [key: string]: string;
    } = {
      Playstation: 'PSN',
      Xbox: 'Live',
      Epic: 'Epic',
      'Epic PC': 'EpicPC',
      'Epic PC Korea': 'EpicPCKorea',
      Shared: 'Shared',
      IOS: 'IOSAppStore',
      Android: 'EpicAndroid',
      Nintendo: 'Nintendo',
      Samsung: 'Samsung',
      WeGame: 'wegame',
    };

    const rows: ActionRowBuilder<ButtonBuilder>[] = [];

    for (let i = 0; i < Object.keys(mtxPlatforms).length; i += 4) {
      const sliced = Object.keys(mtxPlatforms).slice(i, i + 4);

      const row = new ActionRowBuilder<ButtonBuilder>();

      // eslint-disable-next-line no-restricted-syntax
      for (const platform of sliced) {
        row.addComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Secondary)
            .setLabel(platform)
            .setCustomId(mtxPlatforms[platform]),
        );
      }

      rows.push(row);
    }

    const closeButton = new ButtonBuilder()
      .setStyle(ButtonStyle.Danger)
      .setEmoji(Emojis.cross)
      .setCustomId('close')
      .setLabel('Close');

    rows[rows.length - 1].addComponents(closeButton);

    await interaction.editReply({
      content: 'Choose a V-Bucks Platform',
      components: rows,
    });

    const platform = await msg
      .awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id,
        time: 60 * 1000,
      })
      .catch(() => null);

    if (!platform || platform.customId === 'close') {
      await interaction.editReply({
        components: [],
        content: ' ',
      });
      return;
    }

    const updatedPlatform = await client.http.sendEpicgamesRequest(
      true,
      'POST',
      `${Endpoints.MCP}/${epicAccount.accountId}/client/SetMtxPlatform?profileId=common_core`,
      'fortnite',
      {
        'Content-Type': 'application/json',
      },
      {
        newPlatform: platform.customId,
      },
    );

    if (updatedPlatform.error) {
      throw new Error(
        updatedPlatform.error.message ?? updatedPlatform.error.code,
      );
    }

    await interaction.editReply({
      content: `Successfully updated V-Bucks Platform to **${
        Object.keys(mtxPlatforms)[
          Object.values(mtxPlatforms).indexOf(platform.customId)
        ]
      }**`,
      components: [],
    });
  },
};

export default Command;
