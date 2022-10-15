/* eslint-disable prefer-const */
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { Endpoints } from 'fnbr';

import type { ICommand } from '../../structures/Command';
import type { IEpicAccount } from '../../database/models/typings';
import Emojis from '../../resources/Emojis';

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

const itemWorths: {
  [key: string]: {
    [key: string]: number;
  };
} = {
  banner: { uncommon: 0, starwars: 0, marvel: 0, gaminglegends: 0 },
  backpack: {
    rare: 0,
    legendary: 1,
    epic: 0,
    uncommon: 0,
    dark: 0,
    frozen: 0,
    lava: 0,
    marvel: 0,
    shadow: 0,
    icon: 0,
    dc: 0,
    slurp: 0,
    starwars: 0,
    gaminglegends: 0,
    common: 0,
  },
  style: {
    legendary: 0,
    epic: 0,
    rare: 0,
    uncommon: 0,
    dark: 0,
    starwars: 0,
    marvel: 0,
    icon: 0,
    dc: 0,
    gaminglegends: 0,
    shadow: 0,
    slurp: 0,
    frozen: 0,
  },
  petcarrier: { epic: 0, gaminglegends: 0, marvel: 0, starwars: 0 },
  pet: { epic: 0, mythic: 0 },
  pickaxe: {
    rare: 0,
    common: 0,
    uncommon: 0,
    epic: 1,
    slurp: 0,
    dark: 0,
    frozen: 0,
    icon: 1,
    marvel: 0,
    shadow: 0,
    lava: 0,
    gaminglegends: 0,
    dc: 0,
    starwars: 0,
    legendary: 0,
  },
  outfit: {
    common: 0.5,
    uncommon: 1,
    rare: 1.5,
    epic: 2,
    legendary: 2.5,
    dark: 2,
    frozen: 2,
    icon: 2,
    lava: 2,
    marvel: 2,
    shadow: 2,
    gaminglegends: 2,
    dc: 2,
    slurp: 2,
    starwars: 2,
  },
  contrail: {
    uncommon: 0,
    rare: 0,
    dark: 0,
    slurp: 0,
    epic: 0,
    marvel: 0,
    gaminglegends: 0,
    dc: 0,
    starwars: 0,
    common: 0,
  },
  glider: {
    common: 0,
    rare: 0,
    uncommon: 0,
    epic: 1,
    legendary: 2,
    dark: 0,
    icon: 0,
    frozen: 0,
    lava: 0,
    marvel: 0,
    dc: 0,
    starwars: 0,
    gaminglegends: 0,
    shadow: 0,
  },
  emote: {
    rare: 1,
    uncommon: 0.5,
    gaminglegends: 0,
    icon: 1.5,
    marvel: 0,
    epic: 1.5,
    dc: 0,
    frozen: 0,
    legendary: 2,
    starwars: 0,
    common: 0,
  },
  emoji: {
    uncommon: 0,
    marvel: 0,
    slurp: 0,
    dc: 0,
    gaminglegends: 0,
    epic: 0,
    starwars: 0,
    icon: 0,
    rare: 0,
  },
  loadingscreen: {
    uncommon: 0,
    rare: 0,
    icon: 0,
    marvel: 0,
    lava: 0,
    dc: 0,
    starwars: 0,
    gaminglegends: 0,
    epic: 0,
    common: 0,
  },
  music: {
    common: 0,
    rare: 0,
    icon: 0,
    dc: 0,
    marvel: 0,
    gaminglegends: 0,
    uncommon: 0,
  },
  spray: {
    uncommon: 0,
    icon: 0,
    common: 0,
    rare: 0,
    epic: 0,
    legendary: 0,
    marvel: 0,
    gaminglegends: 0,
    dc: 0,
    starwars: 0,
  },
  toy: { rare: 0, epic: 0 },
  wrap: {
    rare: 0,
    uncommon: 0,
    epic: 0,
    slurp: 0,
    shadow: 0,
    dark: 0,
    lava: 0,
    gaminglegends: 0,
    icon: 0,
    marvel: 0,
    dc: 0,
    common: 0,
    starwars: 0,
  },
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

    let [br, allItems] = await Promise.all([
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
      (await client.http.send(
        'GET',
        `http://127.0.0.1:${bot._config.apiPort}/api/cosmetics`,
      )) as any,
    ]);

    if (br.error) {
      throw new Error(br.error.message ?? br.error.code);
    }

    if (allItems.error) {
      throw new Error(allItems.error.message);
    }

    allItems = allItems.response.data;

    const items: {
      [key: string]: any;
    }[] = Object.values(br.response.profileChanges[0]?.profile?.items);

    let itemIds = items.map((_i) => _i.templateId.split(':')[1].toLowerCase());

    const ownedItems = allItems.filter((i: any) =>
      itemIds.includes(i.id.toLowerCase()),
    );
    const exclusives = ownedItems.filter((i: any) => i.isExclusive);
    const crew = ownedItems.filter((i: any) => i.isCrew);

    let worth = 0;

    ownedItems.forEach((i: any) => {
      if (itemWorths[i.type]) {
        worth += itemWorths[i.type][i.rarity] ?? 0;
      }

      if (i.isExclusive) {
        worth += 25;
      }

      if (i.isCrew) {
        worth += 10;
      }

      if (i.isSTW) {
        worth += 10;
      }
    });

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${epicAccount.displayName}'s Account Worth`,
        iconURL: epicAccount.avatarUrl,
      })
      .setColor(bot._config.color)
      .setTimestamp()
      .setDescription(
        `Your Account is worth **${worth.toLocaleString()}** USD`,
      );

    embed.addFields([
      {
        name: 'Locker Cosmetics',
        value: `${Object.keys(customIds)
          .map(
            (id) =>
              `• ${id}: **${items
                .filter((i) => i.templateId.startsWith(customIds[id]))
                .length.toLocaleString()}**`,
          )
          .join('\n')}
• Exclusive's: **${exclusives.length.toLocaleString()}**
• Crew Pack's: **${crew.length.toLocaleString()}**`,
      },
    ]);

    await interaction.editReply({
      content: ' ',
      embeds: [embed],
    });
  },
};

export default Command;
