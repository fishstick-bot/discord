/* eslint-disable no-case-declarations */
import {
  ActionRowBuilder,
  SelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Message,
  SelectMenuInteraction,
  SlashCommandBuilder,
} from 'discord.js';
import axios from 'axios';
// @ts-ignore
import approx from 'approximate-number';
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
    supportedCreator:
      commoncore.response?.profileChanges[0]?.profile?.stats.attributes
        .mtx_affiliate,
  };
};

const Command: ICommand = {
  name: 'gift',

  slashCommandBuilder: new SlashCommandBuilder()
    .setName('gift')
    .setDescription('Gift to a Friend from Fortnite Item Shop.')
    .addStringOption((o) =>
      o
        .setName('friend')
        .setDescription('The friend to gift to.')
        .setRequired(true),
    )
    .addStringOption((o) =>
      o
        .setName('message')
        .setDescription('The message to include with the gift.')
        .setRequired(false),
    ),

  options: {
    needsEpicAccount: true,
  },

  run: async (bot, interaction, user) => {
    let friend = interaction.options.getString('friend')!;
    const message =
      interaction.options.getString('message') ??
      'Gifted using FishStick Bot. https://fishstickbot.com/';

    const epicAccount = (user.epicAccounts as IEpicAccount[]).find(
      (a) => a.accountId === user.selectedEpicAccount,
    );

    if (!epicAccount) {
      throw new Error(
        'You must have an Epic account logged in to use this command. Use `/login` to log in.',
      );
    }

    const client = await bot.fortniteManager.clientFromDeviceAuth(
      epicAccount.accountId,
      epicAccount.deviceId,
      epicAccount.secret,
    );

    const friendAccount = await bot.fortniteManager.searchPlayer(
      epicAccount.accountId,
      friend,
    );

    if (!friendAccount) {
      throw new Error(`User ${friend} not found.`);
    }

    const playerAccountID = friendAccount.accountId;
    if (friendAccount.displayName) {
      friend = friendAccount.displayName;
    }

    const brShop = (
      await axios.get(`http://127.0.0.1:${bot._config.apiPort}/api/catalog/br`)
    ).data;
    const brShopItems: any[] = brShop.data;

    if (brShopItems.length === 0) {
      await interaction.editReply(
        'There are no items in the Battle Royale Item Shop.',
      );
      return;
    }

    const components: ActionRowBuilder<SelectMenuBuilder>[] = [];
    for (let i = 0; i < brShopItems.length; i += 25) {
      components.push(
        new ActionRowBuilder<SelectMenuBuilder>().addComponents(
          new SelectMenuBuilder()
            .setCustomId(`br-shop-${i}`)
            .setPlaceholder(`Shop Menu ${Math.floor(i / 25) + 1}`)
            .addOptions(
              brShopItems.slice(i, i + 25).map((item) => ({
                label: item.displayName ?? item.id ?? 'Unknown Item',
                description: `${approx(
                  item.price.finalPrice,
                ).toUpperCase()} V-Bucks`,
                value: item.offerId,
                emoji: Emojis.vbucks,
              })),
            )
            .setMaxValues(
              brShopItems.slice(i, i + 25).length < 5
                ? brShopItems.slice(i, i + 25).length
                : 5,
            ),
        ),
      );
    }

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${epicAccount.displayName}'s Battle Royale Item Shop`,
        iconURL: epicAccount.avatarUrl,
      })
      .setColor(bot._config.color)
      .setTimestamp()
      .setDescription(
        `Use the drop down menu below to add up to 5 items into your basket to gift to **${friend}**.
  
  **This message will timeout in 60 seconds.**`,
      );

    await interaction.editReply({
      embeds: [embed],
      components,
    });

    const msg = (await interaction.fetchReply()) as Message;

    const selected = (await msg
      .awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id,
        time: 60 * 1000,
      })
      .catch(() => null)) as SelectMenuInteraction;

    if (!selected) {
      await interaction.deleteReply();
      return;
    }

    const items = brShopItems.filter((i) =>
      selected.values.includes(i.offerId),
    );

    const { total, supportedCreator } = await getVBucksData(
      client,
      epicAccount.accountId,
    );

    const totalCartPrice = items
      .map((i) => i.price.finalPrice)
      .reduce((a, b) => a + b, 0);

    // if (total < totalCartPrice) {
    //   await interaction.editReply({
    //     content: `You do not have enough V-Bucks to purchase these items. You need ${approx(
    //       totalCartPrice - total,
    //     ).toUpperCase()} more V-Bucks.`,
    //     embeds: [],
    //     components: [],
    //   });
    //   return;
    // }

    const confirmEmbed = new EmbedBuilder()
      .setAuthor({
        name: `${epicAccount.displayName}'s Battle Royale Item Shop`,
        iconURL: epicAccount.avatarUrl,
      })
      .setColor(bot._config.color)
      .setTimestamp()
      .setDescription(
        `Overall V-Bucks: **${Emojis.vbucks} ${approx(total).toUpperCase()}**
              
  It will cost you: **${Emojis.vbucks} ${approx(
          totalCartPrice,
        ).toUpperCase()}**`,
      )
      .addFields([
        {
          name: 'You are gifting to:',
          value: `• Username: **${friend}**
• Account ID: **${playerAccountID}**`,
        },
      ])
      .addFields([
        {
          name: 'You are gifting these items:',
          value: items
            .map(
              (i) =>
                `• **${i.displayName}** for ${Emojis.vbucks} **${approx(
                  i.price.finalPrice,
                ).toUpperCase()}**`,
            )
            .join('\n'),
        },
      ])
      .setFooter({
        text: 'You are not supporting any creator.',
      });

    if (supportedCreator && supportedCreator.length > 0) {
      confirmEmbed.setFooter({
        text: `Creator Supported: ${supportedCreator}`,
      });
    }

    const confirmBtn = new ButtonBuilder()
      .setLabel('Confirm')
      .setCustomId('confirm')
      .setEmoji(Emojis.tick)
      .setStyle(ButtonStyle.Success);

    const cancelBtn = new ButtonBuilder()
      .setLabel('Cancel')
      .setCustomId('cancel')
      .setEmoji(Emojis.cross)
      .setStyle(ButtonStyle.Danger);

    await interaction.editReply({
      embeds: [confirmEmbed],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          confirmBtn,
          cancelBtn,
        ),
      ],
    });

    const confirm = await msg
      .awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id,
        time: 60 * 1000,
      })
      .catch(() => null);

    if (!confirm || confirm.customId !== 'confirm') {
      await interaction.deleteReply();
      return;
    }

    await interaction.editReply({
      content: `Gifting **${items.length} Items** to **${friend}**${Emojis.loading}`,

      embeds: [],
      components: [],
    });

    const promises = await Promise.all(
      items.map((i) =>
        client.http.sendEpicgamesRequest(
          true,
          'POST',
          `${Endpoints.MCP}/${epicAccount.accountId}/client/GiftCatalogEntry?profileId=common_core`,
          'fortnite',
          { 'Content-Type': 'application/json' },
          {
            offerId: i.offerId,
            purchaseQuantity: 1,
            currency: 'MtxCurrency',
            currencySubType: '',
            expectedTotalPrice: i.price.finalPrice,
            gameContext: '',
            receiverAccountIds: [playerAccountID],
            giftWrapTemplateId: 'GiftBox:gb_giftwrap4',
            personalMessage: message,
          },
        ),
      ),
    );

    const errors = promises.map((p) => p.error).filter((e) => e);
    if (errors.length > 0) {
      const err = `There was an error gifting some items.\n\n${errors
        .map((e) => e!.message)
        .join('\n')}`;

      if (errors.length === promises.length) {
        await interaction.editReply({
          content: err,
          embeds: [],
          components: [],
        });
        return;
      }
      await interaction.followUp({
        content: err,
        embeds: [],
        components: [],
      });
    }

    await interaction.editReply(
      `Successfully gifted **${items.length} Items** for **${
        Emojis.vbucks
      } ${approx(totalCartPrice).toUpperCase()}**

• Gifted to: **${friend}**
• Gift Message: **${message}**
  
**Gifted Items:**
  ${items
    .map(
      (i) =>
        `• **${i.displayName}** for ${Emojis.vbucks} **${approx(
          i.price.finalPrice,
        ).toUpperCase()}**`,
    )
    .join('\n')}`,
    );
  },
};

export default Command;
