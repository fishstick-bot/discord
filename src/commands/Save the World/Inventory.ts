import {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  Message,
  AttachmentBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { Endpoints, Client } from 'fnbr';
import { calcSTWNonSurvivorPowerLevel } from 'fnbr/dist/src/util/Util';
import { promises as fs } from 'fs';
// @ts-ignore
import approx from 'approximate-number';

import type { ICommand } from '../../structures/Command';
import type { IEpicAccount } from '../../database/models/typings';
import Emojis from '../../resources/Emojis';
import Sort from '../../lib/Sort';
import drawSTWInventory from '../../lib/Images/STWInventory';

const getItems = async (
  client: Client,
  accountId: string,
  profileId: string,
) => {
  const res = await client.http.sendEpicgamesRequest(
    true,
    'POST',
    `${Endpoints.MCP}/${accountId}/client/QueryProfile?profileId=${profileId}`,
    'fortnite',
    { 'Content-Type': 'application/json' },
    {},
  );

  if (res.error) {
    throw new Error(res.error.message ?? res.error.code);
  }

  const items = (
    Object.values(res.response?.profileChanges[0]?.profile?.items ?? {}) ?? []
  ).map((i: any) => {
    const isSchematic =
      (i.templateId.includes('Trap') || i.templateId.includes('Weapon')) &&
      !i.templateId.includes('edittool') &&
      !i.templateId.includes('jump_pad') &&
      !i.templateId.includes('buildingitemdata');

    let pl: any = null;
    if (isSchematic) {
      try {
        pl = calcSTWNonSurvivorPowerLevel(
          (/_(c|uc|r|vr|sr|ur)_(?=(crystal|ore|t))/.exec(
            i.templateId,
          )?.[1] as any) ?? 'c',
          i.attributes.level,
          (parseInt(/t([0-9]+)$/.exec(i.templateId)?.[1] ?? '', 10) as any) ??
            0,
        );
      } catch (e) {
        pl = null;
      }
    }

    return {
      id: i.templateId.split(':')[1].toLowerCase(),
      quantity: i.quantity,
      pl,
    };
  });

  return items;
};

const Command: ICommand = {
  name: 'inventory',

  slashCommandBuilder: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('View your Save the World inventory.'),

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

    const backpackBtn = new ButtonBuilder()
      .setCustomId('backpack')
      .setLabel('Backpack')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(Emojis.backpacksize);

    const storageBtn = new ButtonBuilder()
      .setCustomId('storage')
      .setLabel('Storage')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(Emojis.storagesize);

    const venturesBtn = new ButtonBuilder()
      .setCustomId('ventures')
      .setLabel('Ventures Backpack')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(Emojis.ventures);

    const allBtn = new ButtonBuilder()
      .setCustomId('all')
      .setLabel('Backpack + Storage')
      .setStyle(ButtonStyle.Success);

    const closeBtn = new ButtonBuilder()
      .setCustomId('close')
      .setLabel('Close')
      .setStyle(ButtonStyle.Danger)
      .setEmoji(Emojis.cross);

    await interaction.editReply({
      content: 'Choose inventory type to view.',
      components: [
        new ActionRowBuilder<ButtonBuilder>().setComponents(
          backpackBtn,
          storageBtn,
          venturesBtn,
        ),
        new ActionRowBuilder<ButtonBuilder>().setComponents(allBtn, closeBtn),
      ],
    });

    const msg = (await interaction.fetchReply()) as Message;

    const selected = await msg
      .awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id,
        time: 60 * 1000,
      })
      .catch(() => null);

    if (!selected || selected.customId === 'close') {
      await interaction.deleteReply();
      return;
    }

    await interaction.editReply({
      content: `Loading inventory${Emojis.loading}`,
      components: [],
    });

    let items: any[] = [];
    switch (selected.customId) {
      case 'backpack':
        items = await getItems(client, epicAccount.accountId, 'theater0');
        break;

      case 'storage':
        items = await getItems(client, epicAccount.accountId, 'outpost0');
        break;

      case 'ventures':
        items = await getItems(client, epicAccount.accountId, 'theater2');
        break;

      case 'all':
        items = (
          await Promise.all([
            getItems(client, epicAccount.accountId, 'theater0'),
            getItems(client, epicAccount.accountId, 'outpost0'),
          ])
        ).flat();
        break;
    }

    if (items.length === 0) {
      await interaction.editReply(
        'You do not have any items in this inventory.',
      );
      return;
    }

    const stwData = JSON.parse(await fs.readFile('assets/STW.json', 'utf-8'));

    items = items.map((i) => {
      const found = stwData[i.id];

      return {
        id: i.id,
        name: found?.name ?? i.id,
        quantity: i.quantity,
        rarity: found?.rarity ?? 'common',
        pl: i.pl,
      };
    });
    items = items.filter(
      (i) =>
        !i.id.includes('ammo') &&
        !i.id.includes('tool') &&
        !i.id.includes('buildingitemdata'),
    );

    const itemsMap: {
      [key: string]: any;
    } = {};

    Sort(items).forEach((i: any) => {
      if (!itemsMap[i.id]) {
        itemsMap[i.id] = {
          id: i.id,
          name: i.name,
          quantity: 0,
          rarity: i.rarity,
          pl: i.pl,
        };
      }

      itemsMap[i.id].quantity += i.quantity;
    });

    const attachment = new AttachmentBuilder(
      await drawSTWInventory(
        Object.values(itemsMap).map((i) => ({
          ...i,
          quantity: approx(i.quantity).toUpperCase(),
        })),
        epicAccount.displayName,
        interaction.user.tag,
        selected.customId,
      ),
      { name: 'stw-inventory.png' },
    );

    const inventoryLabels: {
      [key: string]: string;
    } = {
      backpack: 'Backpack',
      storage: 'Storage',
      ventures: 'Ventures Backpack',
      all: 'Backpack + Storage',
    };

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${epicAccount.displayName}'s STW ${
          inventoryLabels[selected.customId]
        }`,
        iconURL: epicAccount.avatarUrl,
      })
      .setColor(bot._config.color)
      .setTimestamp()
      .setImage('attachment://stw-inventory.png');

    await interaction.editReply({
      content: ' ',
      components: [],
      embeds: [embed],
      files: [attachment],
    });
  },
};

export default Command;
