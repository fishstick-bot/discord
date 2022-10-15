import {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  SelectMenuBuilder,
  Message,
  SelectMenuInteraction,
  AttachmentBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { Endpoints } from 'fnbr';

import type { ICommand } from '../../structures/Command';
import type { IEpicAccount } from '../../database/models/typings';
import Emojis from '../../resources/Emojis';
import Sort from '../../lib/Sort';
import { drawLocker } from '../../lib/Images/LockerImage';

const customIds: {
  [key: string]: string;
} = {
  "Outfit's": 'AthenaCharacter:',
  "Backpack's": 'AthenaBackpack:',
  "Pickaxe's": 'AthenaPickaxe:',
  "Glider's": 'AthenaGlider:',
  Contrails: 'AthenaSkyDiveContrail',
  Emotes: 'AthenaDance:eid_',
  Toys: 'AthenaDance:toy_',
  Sprays: 'AthenaDance:spid_',
  "Wrap's": 'AthenaItemWrap:',
  "Music Pack's": 'AthenaMusicPack:',
  "Loading Screen's": 'AthenaLoadingScreen',
};

const Command: ICommand = {
  name: 'locker',

  slashCommandBuilder: new SlashCommandBuilder()
    .setName('locker')
    .setDescription('View your Fortnite Locker as an image.'),

  options: {
    needsEpicAccount: true,
  },

  run: async (bot, interaction, user) => {
    const isPremium =
      user.premiumUntil.getTime() > Date.now() || user.isPartner;

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

    const promises = await Promise.all([
      await client.http.sendEpicgamesRequest(
        true,
        'POST',
        `${Endpoints.MCP}/${epicAccount.accountId}/client/QueryProfile?profileId=athena`,
        'fortnite',
        {
          'Content-Type': 'application/json',
        },
        {},
      ),
    ]);
    const br = promises[0];

    if (br.error) {
      throw new Error(br.error.message ?? br.error.code);
    }

    let items: {
      [key: string]: any;
    }[] = Object.values(br.response.profileChanges[0]?.profile?.items);

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${epicAccount.displayName}'s Locker Information`,
        iconURL: epicAccount.avatarUrl,
      })
      .setColor(bot._config.color)
      .setTimestamp()
      .setDescription(
        `Use the dropdown menu below to choose what kind of locker you want to see.
        
**Category Menu**
This menu contains different categories of locker items you want to view in your locker image.

**Special Menu**
This menu contains special items you want to view in your locker image.

**This message will timeout in 60 seconds.**`,
      );

    const createBtn = (label: string) => {
      const btn = new ButtonBuilder()
        .setCustomId(customIds[label])
        .setLabel(label)
        .setStyle(ButtonStyle.Primary);

      return btn;
    };

    const menu1 = new SelectMenuBuilder()
      .setCustomId('menu1')
      .setPlaceholder('Category Menu')
      .setOptions(
        Object.keys(customIds).map((label) => ({
          label,
          value: customIds[label],
          description: `View your ${label.replace("'s", '')} cosmetics.`,
        })),
      );

    const menu2 = new SelectMenuBuilder()
      .setCustomId('menu2')
      .setPlaceholder('⭐️ Special Menu')
      .setDisabled(!isPremium)
      .setOptions([
        {
          label: 'Crew',
          value: 'crew',
          description: `View your crew pack rarity cosmetics.`,
        },
        {
          label: 'STW',
          value: 'stw',
          description: `View your save the world rarity cosmetics.`,
        },
        {
          label: 'Exclusive',
          value: 'exclusives',
          description: `View your exclusive rarity cosmetics.`,
        },
        {
          label: 'Full',
          value: 'full',
          description: `View your full locker.`,
        },
      ]);

    await interaction.editReply({
      content: ' ',
      embeds: [embed],
      components: [
        new ActionRowBuilder<SelectMenuBuilder>().setComponents(menu1),
        new ActionRowBuilder<SelectMenuBuilder>().setComponents(menu2),
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
      await interaction.deleteReply();
      return;
    }

    const chosen = (selected as SelectMenuInteraction).values[0];

    switch (selected.customId) {
      case 'menu1':
        items = items.filter((i) => i.templateId.startsWith(chosen));
        break;
    }

    const ownedItems = items.map((i) =>
      i.templateId.split(':')[1].toLowerCase(),
    );
    const ownedStyles = items
      .map((i) =>
        (i.attributes.variants ?? []).map((v: any) =>
          (v.owned ?? []).map((o: any) =>
            `${i.templateId.split(':')[1]}-${o}`.toLowerCase(),
          ),
        ),
      )
      .flat(2);

    let allItems: any = await client.http.send(
      'GET',
      `http://127.0.0.1:${bot._config.apiPort}/api/cosmetics`,
    );

    if (allItems.error) {
      throw new Error(allItems.error.message);
    }

    allItems = allItems.response.data;

    items = [
      ...allItems.filter((i: any) => ownedItems.includes(i.id.toLowerCase())),
      ...allItems.filter(
        (i: any) => ownedStyles.includes(i.id.toLowerCase()) && i.isExclusive,
      ),
    ];

    switch (selected.customId) {
      case 'menu2':
        switch (chosen) {
          case 'crew':
            items = items.filter((i) => i.isCrew);
            break;

          case 'stw':
            items = items.filter((i) => i.isSTW);
            break;

          case 'exclusives':
            items = items.filter((i) => i.isExclusive);
            break;

          case 'full':
            items = allItems.filter((i: any) =>
              ownedItems.includes(i.id.toLowerCase()),
            );
        }
        break;
    }

    items = Sort(items);

    if (items.length === 0) {
      await interaction.editReply(`You don't have any items in your locker.`);
      return;
    }

    await interaction.editReply({
      content: `Rendering locker image for ${items.length} items${Emojis.loading}`,
      embeds: [],
      components: [],
    });

    embed.setAuthor({
      name: `${epicAccount.displayName}'s Locker`,
      iconURL: epicAccount.avatarUrl,
    });

    // split locker in chunks of 500
    for (let i = 0; i < items.length; i += 500) {
      const start = Date.now();
      const chunkedItems = items.slice(i, i + 500);
      // eslint-disable-next-line no-await-in-loop
      const img = await drawLocker(
        chunkedItems,
        epicAccount.displayName,
        interaction.user.tag,
      );
      const end = Date.now();

      embed
        .setDescription(
          `${i} to ${i + chunkedItems.length} of ${items.length} items.
Rendered in **${((end - start) / 1000).toFixed(2)}s**.`,
        )
        .setImage(`attachment://locker-${i}.png`);

      // eslint-disable-next-line no-await-in-loop
      await interaction.followUp({
        content: ' ',
        embeds: [embed],
        files: [new AttachmentBuilder(img, { name: `locker-${i}.png` })],
        components: [],
      });
    }

    await interaction.editReply({
      content: 'Rendered all locker images.',
    });
  },
};

export default Command;
