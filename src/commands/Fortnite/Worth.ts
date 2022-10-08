import {
  MessageEmbed,
  MessageButton,
  MessageActionRow,
  MessageSelectMenu,
  Message,
  SelectMenuInteraction,
  MessageAttachment,
} from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
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
  name: 'worth',

  slashCommandBuilder: new SlashCommandBuilder()
    .setName('worth')
    .setDescription("View your Fortnite Account's worth."),

  options: {
    needsEpicAccount: true,
    premiumOnly: true,
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

    const [br, stw] = await Promise.all([
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
      await client.http.sendEpicgamesRequest(
        true,
        'POST',
        `${Endpoints.MCP}/${epicAccount.accountId}/client/QueryProfile?profileId=campaign`,
        'fortnite',
        {
          'Content-Type': 'application/json',
        },
        {},
      ),
    ]);

    if (br.error) {
      throw new Error(br.error.message ?? br.error.code);
    }

    let allItems: any = await client.http.send(
      'GET',
      `http://127.0.0.1:${bot._config.apiPort}/api/cosmetics`,
    );

    if (allItems.error) {
      throw new Error(allItems.error.message);
    }

    allItems = allItems.response.data;

    const items: {
      [key: string]: any;
    }[] = Object.values(br.response.profileChanges[0]?.profile?.items);

    const ownedItems = allItems.filter((i: any) =>
      items
        .map((_i) => _i.templateId.split(':')[1].toLowerCase())
        .includes(i.id.toLowerCase()),
    );
    const exclusives = ownedItems.filter((i: any) => i.isExclusive);
    const crew = ownedItems.filter((i: any) => i.isCrew);

    const embed = new MessageEmbed()
      .setAuthor({
        name: `${epicAccount.displayName}'s Account Worth`,
        iconURL: epicAccount.avatarUrl,
      })
      .setColor(bot._config.color)
      .setTimestamp()
      .setDescription(`TODO`);

    embed.addField(
      'Locker Cosmetics',
      `${Object.keys(customIds)
        .map(
          (id) =>
            `• ${id}: **${items
              .filter((i) => i.templateId.startsWith(customIds[id]))
              .length.toLocaleString()}**`,
        )
        .join('\n')}
• Exclusive's: **${exclusives.length.toLocaleString()}**
• Crew Pack's: **${crew.length.toLocaleString()}**`,
    );

    await interaction.editReply({
      content: ' ',
      embeds: [embed],
    });

    // switch (selected.customId) {
    //   case 'menu1':
    //     items = items.filter((i) => i.templateId.startsWith(chosen));
    //     break;
    // }

    //     const ownedItems = items.map((i) =>
    //       i.templateId.split(':')[1].toLowerCase(),
    //     );
    //     const ownedStyles = items
    //       .map((i) =>
    //         (i.attributes.variants ?? []).map((v: any) =>
    //           (v.owned ?? []).map((o: any) =>
    //             `${i.templateId.split(':')[1]}-${o}`.toLowerCase(),
    //           ),
    //         ),
    //       )
    //       .flat(2);

    //     let allItems: any = await client.http.send(
    //       'GET',
    //       `http://127.0.0.1:${bot._config.apiPort}/api/cosmetics`,
    //     );

    //     if (allItems.error) {
    //       throw new Error(allItems.error.message);
    //     }

    //     allItems = allItems.response.data;

    //     items = [
    //       ...allItems.filter((i: any) => ownedItems.includes(i.id.toLowerCase())),
    //       ...allItems.filter(
    //         (i: any) => ownedStyles.includes(i.id.toLowerCase()) && i.isExclusive,
    //       ),
    //     ];

    //     switch (selected.customId) {
    //       case 'menu2':
    //         switch (chosen) {
    //           case 'crew':
    //             items = items.filter((i) => i.isCrew);
    //             break;

    //           case 'stw':
    //             items = items.filter((i) => i.isSTW);
    //             break;

    //           case 'exclusives':
    //             items = items.filter((i) => i.isExclusive);
    //             break;

    //           case 'full':
    //             items = allItems.filter((i: any) =>
    //               ownedItems.includes(i.id.toLowerCase()),
    //             );
    //         }
    //         break;
    //     }

    //     items = Sort(items);

    //     if (items.length === 0) {
    //       await interaction.editReply(`You don't have any items in your locker.`);
    //       return;
    //     }

    //     await interaction.editReply({
    //       content: `Rendering locker image for ${items.length} items${Emojis.loading}`,
    //       embeds: [],
    //       components: [],
    //     });

    //     embed.setAuthor({
    //       name: `${epicAccount.displayName}'s Locker`,
    //       iconURL: epicAccount.avatarUrl,
    //     });

    //     // split locker in chunks of 500
    //     for (let i = 0; i < items.length; i += 500) {
    //       const start = Date.now();
    //       const chunkedItems = items.slice(i, i + 500);
    //       // eslint-disable-next-line no-await-in-loop
    //       const img = await drawLocker(
    //         chunkedItems,
    //         epicAccount.displayName,
    //         interaction.user.tag,
    //       );
    //       const end = Date.now();

    //       embed
    //         .setDescription(
    //           `${i} to ${i + chunkedItems.length} of ${items.length} items.
    //   Rendered in **${((end - start) / 1000).toFixed(2)}s**.`,
    //         )
    //         .setImage(`attachment://locker-${i}.png`);

    //       // eslint-disable-next-line no-await-in-loop
    //       await interaction.followUp({
    //         content: ' ',
    //         embeds: [embed],
    //         files: [new MessageAttachment(img, `locker-${i}.png`)],
    //         components: [],
    //       });
    //     }

    //     await interaction.editReply({
    //       content: 'Rendered all locker images.',
    //     });
  },
};

export default Command;
