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
import { promises as fs } from 'fs';
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

const updateSac = async (client: Client, accountId: string, code: string) => {
  if (!code) return;

  await client.http
    .sendEpicgamesRequest(
      true,
      'POST',
      `${Endpoints.MCP}/${accountId}/client/SetAffiliateName?profileId=common_core`,
      'fortnite',
      {
        'Content-Type': 'application/json',
      },
      {
        affiliateName: code,
      },
    )
    .catch(() => null);
};

const getCurrentSac = async (client: Client, accountId: string) => {
  try {
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

    const currentSac =
      commoncore.response?.profileChanges[0]?.profile?.stats.attributes
        .mtx_affiliate;

    await updateSac(client, accountId, 'CODEERROR404');

    return currentSac;
  } catch (e) {
    return null;
  }
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

    let embed: EmbedBuilder;
    let confirmEmbed: EmbedBuilder;
    let components: ActionRowBuilder<SelectMenuBuilder>[];
    let msg: Message;
    let selected: SelectMenuInteraction;
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

        components = [];
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

        embed = new EmbedBuilder()
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

        msg = (await interaction.fetchReply()) as Message;

        selected = (await msg
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

        confirmEmbed = new EmbedBuilder()
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
          .addFields([
            {
              name: 'You are purchasing:',
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
          content: `Purchasing **${items.length} Items**${Emojis.loading}`,

          embeds: [],
          components: [],
        });

        const currentSac = await getCurrentSac(client, epicAccount.accountId);
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
        await updateSac(client, epicAccount.accountId, currentSac);

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
        const stwData = JSON.parse(
          await fs.readFile('assets/STW.json', 'utf-8'),
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

        const purchaseTrackers = Object.values(
          commoncore.response?.profileChanges[0]?.profile?.items,
        ).filter((i: any) =>
          i.templateId.startsWith('EventPurchaseTracker:generic_instance'),
        ) as any[];

        const isEventItemOwned = (
          offerId: string,
          quantity: number,
          eventId: string,
        ) => {
          const purchases: {
            [key: string]: any;
          } = {};
          purchaseTrackers
            .filter((i) => i.attributes.event_instance_id === eventId)
            .forEach((i) => {
              Object.entries(i.attributes.event_purchases ?? []).forEach(
                ([k, v]) => {
                  purchases[k] = v;
                },
              );
            });

          if (purchases[offerId] && purchases[offerId] >= quantity) return true;
          return false;
        };

        const parseDevName = (str: string) =>
          str
            .substring('[VIRTUAL]'.length, str.lastIndexOf(' for '))
            .split(', ')[0];
        const parseQuantity = (str: string) =>
          parseInt(parseDevName(str).split(' x ')[0], 10);

        const isOwned = (i: { [key: string]: any }) => {
          const eventLimit = parseInt(
            i.meta?.PurchaseLimitingEventId || -1,
            10,
          );
          const dailyLimit = i.dailyLimit ?? -1;
          const weeklyLimit = i.weeklyLimit ?? -1;
          const monthlyLimit = i.monthlyLimit ?? -1;

          let owned = false;
          if (eventLimit >= 0) {
            owned = isEventItemOwned(
              i.offerId,
              parseQuantity(i.devName),
              i.meta?.PurchaseLimitingEventId,
            );
          } else if (
            dailyLimit >= 0 &&
            new Date().getTime() -
              new Date(
                commoncore.response.profileChanges[0].profile.stats.attributes.daily_purchases.lastInterval,
              ).getTime() <=
              24 * 60 * 60 * 1000
          ) {
            owned =
              Object.keys(
                commoncore.response.profileChanges[0].profile.stats.attributes
                  .daily_purchases.purchaseList,
              ).includes(i.offerId) &&
              commoncore.response.profileChanges[0].profile.stats.attributes
                .daily_purchases.purchaseList[i.offerId] >= dailyLimit;
          } else if (
            weeklyLimit >= 0 &&
            new Date().getTime() -
              new Date(
                commoncore.response.profileChanges[0].profile.stats.attributes.weekly_purchases.lastInterval,
              ).getTime() <=
              7 * 24 * 60 * 60 * 1000
          ) {
            owned =
              Object.keys(
                commoncore.response.profileChanges[0].profile.stats.attributes
                  .weekly_purchases.purchaseList,
              ).includes(i.offerId) &&
              commoncore.response.profileChanges[0].profile.stats.attributes
                .weekly_purchases.purchaseList[i.offerId] >= weeklyLimit;
          } else if (
            monthlyLimit >= 0 &&
            new Date().getTime() -
              new Date(
                commoncore.response.profileChanges[0].profile.stats.attributes.monthly_purchases.lastInterval,
              ).getTime() <=
              30 * 24 * 60 * 60 * 1000
          ) {
            owned =
              Object.keys(
                commoncore.response.profileChanges[0].profile.stats.attributes
                  .monthly_purchases.purchaseList,
              ).includes(i.offerId) &&
              commoncore.response.profileChanges[0].profile.stats.attributes
                .monthly_purchases.purchaseList[i.offerId] >= monthlyLimit;
          }

          return owned;
        };

        const catalogRes = await client.http.sendEpicgamesRequest(
          true,
          'GET',
          'https://fortnite-public-service-prod11.ol.epicgames.com/fortnite/api/storefront/v2/catalog',
          'fortnite',
        );

        if (catalogRes.error) {
          throw new Error(catalogRes.error.message);
        }

        const storefronts = catalogRes.response.storefronts as {
          name: string;
          catalogEntries: {
            [key: string]: any;
          }[];
        }[];

        const weeklyStore = storefronts.find(
          (s) => s.name === 'STWRotationalEventStorefront',
        )!;
        weeklyStore.catalogEntries.filter((i) => !isOwned(i));

        const eventStore = storefronts.find(
          (s) => s.name === 'STWSpecialEventStorefront',
        )!;
        eventStore.catalogEntries.filter((i) => !isOwned(i));

        if (!weeklyStore || !eventStore) {
          throw new Error('Unable to fetch STW store.');
        }

        if (
          weeklyStore.catalogEntries.length === 0 &&
          eventStore.catalogEntries.length === 0
        ) {
          throw new Error('You already own all items of STW store.');
        }

        components = [];

        for (let i = 0; i < weeklyStore.catalogEntries.length; i += 25) {
          components.push(
            new ActionRowBuilder<SelectMenuBuilder>().addComponents(
              new SelectMenuBuilder()
                .setCustomId(`stw-weely-shop-${i}`)
                .setPlaceholder(`Weekly Store Menu ${Math.floor(i / 25) + 1}`)
                .addOptions(
                  weeklyStore.catalogEntries.slice(i, i + 25).map((item) => ({
                    label: `${parseQuantity(item.devName)}x ${
                      stwData[
                        parseDevName(item.devName).split(' x ')[1].toLowerCase()
                      ]?.name ?? parseDevName(item.devName).split(' x ')[1]
                    }`,
                    description: `${item.prices
                      .map(
                        (p: any) =>
                          `${p.finalPrice.toLocaleString()}x ${
                            stwData[
                              p.currencySubType.split(':')[1].toLowerCase()
                            ]?.name ??
                            p.currencySubType.split(':')[1].toLowerCase()
                          }`,
                      )
                      .join(' | ')}`,
                    value: item.offerId,
                    emoji: Emojis['AccountResource:eventcurrency_scaling'],
                  })),
                )
                .setMaxValues(
                  weeklyStore.catalogEntries.slice(i, i + 25).length < 5
                    ? weeklyStore.catalogEntries.slice(i, i + 25).length
                    : 5,
                ),
            ),
          );
        }

        for (let i = 0; i < eventStore.catalogEntries.length; i += 25) {
          components.push(
            new ActionRowBuilder<SelectMenuBuilder>().addComponents(
              new SelectMenuBuilder()
                .setCustomId(`stw-event-shop-${i}`)
                .setPlaceholder(`Event Store Menu ${Math.floor(i / 25) + 1}`)
                .addOptions(
                  eventStore.catalogEntries.slice(i, i + 25).map((item) => ({
                    label: `${parseQuantity(item.devName)}x ${
                      stwData[
                        parseDevName(item.devName).split(' x ')[1].toLowerCase()
                      ]?.name ?? parseDevName(item.devName).split(' x ')[1]
                    }`,
                    description: `${item.prices
                      .map(
                        (p: any) =>
                          `${p.finalPrice.toLocaleString()}x ${
                            stwData[
                              p.currencySubType.split(':')[1].toLowerCase()
                            ]?.name ??
                            p.currencySubType.split(':')[1].toLowerCase()
                          }`,
                      )
                      .join(' | ')}`,
                    value: item.offerId,
                    emoji: Emojis['AccountResource:eventcurrency_scaling'],
                  })),
                )
                .setMaxValues(
                  eventStore.catalogEntries.slice(i, i + 25).length < 5
                    ? eventStore.catalogEntries.slice(i, i + 25).length
                    : 5,
                ),
            ),
          );
        }

        embed = new EmbedBuilder()
          .setAuthor({
            name: `${epicAccount.displayName}'s Save the World Item Shop`,
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

        msg = (await interaction.fetchReply()) as Message;

        selected = (await msg
          .awaitMessageComponent({
            filter: (i) => i.user.id === interaction.user.id,
            time: 60 * 1000,
          })
          .catch(() => null)) as SelectMenuInteraction;

        if (!selected) {
          await interaction.deleteReply();
          return;
        }

        const selectedStwItems = [
          ...weeklyStore.catalogEntries,
          ...eventStore.catalogEntries,
        ].filter((i) => selected.values.includes(i.offerId));

        confirmEmbed = new EmbedBuilder()
          .setAuthor({
            name: `${epicAccount.displayName}'s Save the World Item Shop`,
            iconURL: epicAccount.avatarUrl,
          })
          .setColor(bot._config.color)
          .setTimestamp()
          .addFields([
            {
              name: 'You are purchasing:',
              value: selectedStwItems
                .map(
                  (i) =>
                    `• **${parseQuantity(i.devName)}x ${
                      stwData[
                        parseDevName(i.devName).split(' x ')[1].toLowerCase()
                      ]?.name ?? parseDevName(i.devName).split(' x ')[1]
                    }** for ${
                      Emojis['AccountResource:eventcurrency_scaling']
                    } **${approx(i.prices[0].finalPrice).toUpperCase()}**`,
                )
                .join('\n'),
            },
          ]);

        await interaction.editReply({
          embeds: [confirmEmbed],
          components: [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              confirmBtn,
              cancelBtn,
            ),
          ],
        });

        const confirmSTW = await msg
          .awaitMessageComponent({
            filter: (i) => i.user.id === interaction.user.id,
            time: 60 * 1000,
          })
          .catch(() => null);

        if (!confirmSTW || confirmSTW.customId !== 'confirm') {
          await interaction.deleteReply();
          return;
        }

        await interaction.editReply({
          content: `Purchasing **${selectedStwItems.length} Items**${Emojis.loading}`,

          embeds: [],
          components: [],
        });

        const promisesSTW = await Promise.all(
          selectedStwItems.map((i) =>
            client.http.sendEpicgamesRequest(
              true,
              'POST',
              `${Endpoints.MCP}/${epicAccount.accountId}/client/PurchaseCatalogEntry?profileId=common_core`,
              'fortnite',
              { 'Content-Type': 'application/json' },
              {
                offerId: i.offerId,
                purchaseQuantity: 1,
                currency: i.prices[0].currencyType,
                currencySubType: i.prices[0].currencySubType,
                expectedTotalPrice: i.prices[0].finalPrice,
                gameContext: '',
              },
            ),
          ),
        );

        const errorsSTW = promisesSTW.map((p) => p.error).filter((e) => e);
        if (errorsSTW.length > 0) {
          const err = `There was an error gifting some items.\n\n${errorsSTW
            .map((e) => e!.message)
            .join('\n')}`;

          if (errorsSTW.length === promisesSTW.length) {
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
          `Successfully purchased **${selectedStwItems.length} Items**
  
  **Purchased Items:**
  ${selectedStwItems
    .map(
      (i) =>
        `• **${parseQuantity(i.devName)}x ${
          stwData[parseDevName(i.devName).split(' x ')[1].toLowerCase()]
            ?.name ?? parseDevName(i.devName).split(' x ')[1]
        }** for ${Emojis['AccountResource:eventcurrency_scaling']} **${approx(
          i.prices[0].finalPrice,
        ).toUpperCase()}**`,
    )
    .join('\n')}`,
        );
        break;
    }
  },
};

export default Command;
