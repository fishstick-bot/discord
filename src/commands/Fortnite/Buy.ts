/* eslint-disable no-case-declarations */
import {
  MessageActionRow,
  MessageSelectMenu,
  MessageButton,
  MessageEmbed,
  Message,
  SelectMenuInteraction,
} from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
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
  name: 'buy',

  slashCommandBuilder: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Buy from Fortnite Item Shop.')
    .addSubcommand((c) =>
      c
        .setName('br')
        .setDescription('Buy from Fortnite Battle Royale Item Shop.'),
    )
    .addSubcommand((c) =>
      c
        .setName('stw')
        .setDescription('Buy from Fortnite Save the World Item Shop.'),
    ),

  options: {
    needsEpicAccount: true,
  },

  run: async (bot, interaction, user) => {
    const subcommand = interaction.options.getSubcommand();

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

    let embed: MessageEmbed;
    switch (subcommand) {
      case 'br':
        const brShop = (
          await axios.get(
            `http://127.0.0.1:${bot._config.apiPort}/api/catalog/br`,
          )
        ).data;
        const brShopItems: any[] = brShop.data;

        if (brShopItems.length === 0) {
          await interaction.editReply(
            'There are no items in the Battle Royale Item Shop.',
          );
          return;
        }

        const components: MessageActionRow[] = [];
        for (let i = 0; i < brShopItems.length; i += 25) {
          components.push(
            new MessageActionRow().addComponents(
              new MessageSelectMenu()
                .setCustomId(`br-shop-${i}`)
                .setPlaceholder(`Shop Menu ${Math.floor(i / 25) + 1}`)
                .addOptions(
                  brShopItems.slice(i, i + 25).map((item) => ({
                    label: item.displayName,
                    description: `${approx(
                      item.price.finalPrice,
                    ).toUpperCase()} V-Bucks`,
                    value: item.offerId,
                    emoji: Emojis.vbucks,
                  })),
                )
                .setMaxValues(5),
            ),
          );
        }

        embed = new MessageEmbed()
          .setAuthor({
            name: `${epicAccount.displayName}'s Battle Royale Item Shop`,
            iconURL: epicAccount.avatarUrl,
          })
          .setColor(bot._config.color)
          .setTimestamp()
          .setDescription(
            `Use the drop down menu below to add up to 5 items into your basket.

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

        if (total < totalCartPrice) {
          await interaction.editReply({
            content: `You do not have enough V-Bucks to purchase these items. You need ${approx(
              totalCartPrice - total,
            ).toUpperCase()} more V-Bucks.`,
            embeds: [],
            components: [],
          });
          return;
        }

        const confirmEmbed = new MessageEmbed()
          .setAuthor({
            name: `${epicAccount.displayName}'s Battle Royale Item Shop`,
            iconURL: epicAccount.avatarUrl,
          })
          .setColor(bot._config.color)
          .setTimestamp()
          .setDescription(
            `Overall V-Bucks: **${Emojis.vbucks} ${approx(
              total,
            ).toUpperCase()}**
            
It will cost you: **${Emojis.vbucks} ${approx(totalCartPrice).toUpperCase()}**`,
          )
          .addField(
            'You are purchasing:',
            items
              .map(
                (i) =>
                  `• **${i.displayName}** for ${Emojis.vbucks} **${approx(
                    i.price.finalPrice,
                  ).toUpperCase()}**`,
              )
              .join('\n'),
          )
          .setFooter({
            text: 'You are not supporting any creator.',
          });

        if (supportedCreator && supportedCreator.length > 0) {
          confirmEmbed.setFooter({
            text: `Creator Supported: ${supportedCreator}`,
          });
        }

        const confirmBtn = new MessageButton()
          .setLabel('Confirm')
          .setCustomId('confirm')
          .setEmoji(Emojis.tick)
          .setStyle('SUCCESS');

        const cancelBtn = new MessageButton()
          .setLabel('Cancel')
          .setCustomId('cancel')
          .setEmoji(Emojis.cross)
          .setStyle('DANGER');

        await interaction.editReply({
          embeds: [confirmEmbed],
          components: [
            new MessageActionRow().addComponents(confirmBtn, cancelBtn),
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
          content: `Purchasing **${items.length} Items**${Emojis.loading}`,

          embeds: [],
          components: [],
        });

        const promises = await Promise.all(
          items.map((i) =>
            client.http.sendEpicgamesRequest(
              true,
              'POST',
              `${Endpoints.MCP}/${epicAccount.accountId}/client/PurchaseCatalogEntry?profileId=common_core`,
              'fortnite',
              { 'Content-Type': 'application/json' },
              {
                offerId: i.offerId,
                purchaseQuantity: 1,
                currency: 'MtxCurrency',
                currencySubType: '',
                expectedTotalPrice: i.price.finalPrice,
                gameContext: '',
              },
            ),
          ),
        );

        const errors = promises.map((p) => p.error).filter((e) => e);
        if (errors.length > 0) {
          const err = `There was an error gifting some tems.\n\n${errors
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
          `Successfully purchased **${items.length} Items** for **${
            Emojis.vbucks
          } ${approx(totalCartPrice).toUpperCase()}**

**Purchased Items:**
${items
  .map(
    (i) =>
      `• **${i.displayName}** for ${Emojis.vbucks} **${approx(
        i.price.finalPrice,
      ).toUpperCase()}**`,
  )
  .join('\n')}`,
        );
        break;

      case 'stw':
        await interaction.editReply('TODO');
        break;
    }
  },
};

export default Command;
