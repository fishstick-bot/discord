/* eslint-disable no-param-reassign */
import {
  MessageEmbed,
  MessageButton,
  MessageSelectMenu,
  MessageActionRow,
  Message,
  MessageAttachment,
  SelectMenuInteraction,
} from 'discord.js';
import { SlashCommandBuilder, time } from '@discordjs/builders';
import type { STWProfile } from 'fnbr';
import { promises as fs } from 'fs';
// @ts-ignore
import approx from 'approximate-number';

import type { ICommand } from '../../structures/Command';
import type { IEpicAccount } from '../../database/models/typings';
import Emojis from '../../resources/Emojies';
import Sort from '../../lib/Sort';
import drawSTWResources from '../../lib/images/STWResources';

const bisect = (array: number[], x: number) => {
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < array.length; i++) {
    if (array[i] >= x) return i;
  }
  return array.length;
};

const Command: ICommand = {
  name: 'stw',

  slashCommandBuilder: new SlashCommandBuilder()
    .setName('stw')
    .setDescription('View Save the World resources/stats for any player.')
    .addStringOption((o) =>
      o
        .setName('player')
        .setDescription('The player to view Save the World stats for.')
        .setRequired(false),
    ),

  options: {
    needsEpicAccount: true,
  },

  run: async (bot, interaction, user) => {
    let player = interaction.options.getString('player');

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

    let playerAccountID: string | null = null;
    if (player) {
      const playerAccount = await bot.fortniteManager.searchPlayer(
        epicAccount.accountId,
        player,
      );

      if (!playerAccount) {
        throw new Error(`Player ${player} not found.`);
      }

      playerAccountID = playerAccount.accountId;
      if (playerAccount.displayName) {
        player = playerAccount.displayName;
      }
    }

    let stw: STWProfile | null = null;
    const refreshSTWProfile = async () => {
      stw = await client.getSTWProfile(
        playerAccountID ?? epicAccount.accountId,
      );
    };
    await refreshSTWProfile();

    const tutorialCompleted =
      (stw!.items.find((i) => i.templateId === 'Quest:homebaseonboarding')
        ?.attributes.completion_hbonboarding_completezone ?? 0) > 0;

    if (!tutorialCompleted) {
      throw new Error(
        `${player ?? 'You'} must complete ${
          player ? 'the' : 'your'
        } tutorial before you can view ${player ? 'their' : 'your'} stats.`,
      );
    }

    const stwData = JSON.parse(await fs.readFile('assets/STW.json', 'utf-8'));
    const venturesData = JSON.parse(
      await fs.readFile('assets/PhoenixLevelRewardsTable.json', 'utf-8'),
    );
    const stwQuests = JSON.parse(
      await fs.readFile('assets/STWQuests.json', 'utf-8'),
    );

    const rawEmbed = () => {
      const embed = new MessageEmbed()
        .setAuthor({
          name: `${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
        })
        .setTitle(
          `[${stw?.powerLevel.toFixed(2)}] ${
            player ?? epicAccount.displayName
          }'s STW Overview`,
        )
        .setColor(bot._config.color)
        .setTimestamp()
        .setFooter({
          text: `Account ID: ${playerAccountID ?? epicAccount.accountId}`,
        });

      if (!playerAccountID) {
        embed.setThumbnail(epicAccount.avatarUrl);
      }

      return embed;
    };

    const createSTWOverviewEmbed = () => {
      const mfa = stw!.stats.mfaRewardClaimed;
      let backpackSize = 50;
      let storageSize = 0;
      let researchPoints = 0;
      const ssds: {
        [key: string]: number;
      } = {
        Stonewood: 0,
        Plankerton: 0,
        'Canny Valley': 0,
        'Twine Peaks': 0,
      };
      const endurances: {
        [key: string]: Date | false;
      } = {
        Stonewood: false,
        Plankerton: false,
        'Canny Valley': false,
        'Twine Peaks': false,
      };

      let brxp = 0;

      // eslint-disable-next-line no-restricted-syntax
      for (const item of stw!.items) {
        const split = item.templateId.split('_');

        if (item.templateId === 'HomebaseNode:skilltree_backpacksize') {
          backpackSize += item.quantity * 20;
        }

        if (item.templateId === 'HomebaseNode:skilltree_stormshieldstorage') {
          storageSize += item.quantity * 20;
        }

        if (item.templateId === 'Token:collectionresource_nodegatetoken01') {
          researchPoints += item.quantity;
        }

        if (
          item.templateId.includes('Quest:outpostquest_t') &&
          item.attributes.quest_state === 'Claimed'
        ) {
          const ssdnum =
            (parseInt(split[split.length - 2].replaceAll('t', ''), 10) ?? 1) -
            1;
          const ssdquan =
            parseInt(split[split.length - 1].replace('l', ''), 10) ?? 0;
          const ssdname = Object.keys(ssds)[ssdnum];

          if (ssds[ssdname]! < ssdquan) {
            ssds[ssdname]! = ssdquan;
          }
        }

        if (item.templateId.includes('Quest:endurancewave30theater')) {
          const endurancenum =
            (parseInt(
              item.templateId.split('')[item.templateId.split('').length - 1],
              10,
            ) ?? 1) - 1;
          endurances[Object.keys(endurances)[endurancenum]] = new Date(
            item.attributes.last_state_change_time,
          );
        }

        if (item.templateId === 'Token:stw_accolade_tracker') {
          brxp = item.attributes.daily_xp;
        }
      }

      if (mfa) {
        backpackSize += 10;
      }

      const embed = rawEmbed()
        .setDescription(
          `• Account Level: **${stw?.stats.actualLevel.toLocaleString()}**
• Backpack Size: **${backpackSize}**
• Storage Size: **${storageSize}**
• Zones Completed: **${stw?.stats.matchesPlayed.toLocaleString()}**
• Collection Book Level: **${stw?.stats.collectionBookMaxXPLevel?.toLocaleString()}**
• Unslot Cost: **${stw?.stats.unslotMtxSpend.toLocaleString()}**
• FORT Stats: **${Object.keys(stw?.FORTStats!)
            .map(
              (s) =>
                `${(Emojis as any)[s]!} ${(stw?.FORTStats! as any)[
                  s
                ].toLocaleString()}`,
            )
            .join(' ')}**
• Research: **${Object.keys(stw?.stats.researchLevels!)
            .map(
              (s) =>
                `${(Emojis as any)[s]!} ${
                  (stw?.stats.researchLevels! as any)[s]
                }`,
            )
            .join(' ')} ${
            Emojis.research
          } ${researchPoints.toLocaleString()}**`,
        )
        .addField(
          'SSD Completions',
          Object.keys(ssds)
            .map((s) => `• ${s}: **${ssds[s]}**`)
            .join('\n'),
          true,
        )
        .addField(
          'Endurance Completions',
          Object.keys(endurances)
            .map(
              (s) =>
                `• ${s}: ${
                  endurances[s]
                    ? `${time((endurances[s] as Date)!, 'd')}`
                    : '**Not Completed**'
                }`,
            )
            .join('\n'),
          true,
        )
        .addField(
          'Battle Royale Accolade XP',
          `**${brxp.toLocaleString()} / ${(450000).toLocaleString()} ${
            Emojis.brxp
          }**`,
        );
      return embed;
    };

    const createSTWResourcesImage = async () => {
      const resources: any = stw!.resources.map((r) => ({
        id: r.templateId.split(':')[1].toLowerCase(),
        name:
          stwData[r.templateId.split(':')[1].toLowerCase()]?.name ?? 'Unknown',
        rarity:
          stwData[r.templateId.split(':')[1].toLowerCase()]?.rarity ?? 'common',
        quantity: approx(r.quantity).toUpperCase(),
      }));

      const attachment = new MessageAttachment(
        await drawSTWResources(
          Sort(resources),
          player ?? epicAccount.displayName,
          interaction.user.tag,
        ),
        'stw-resources.png',
      );

      return attachment;
    };

    const createSTWResourcesEmbed = () => {
      const embed = rawEmbed()
        .setTitle(
          `[${stw?.powerLevel.toFixed(2)}] ${
            player ?? epicAccount.displayName
          }'s STW Resources`,
        )
        .setImage('attachment://stw-resources.png');

      return embed;
    };

    const createSTWVenturesEmbed = () => {
      const venturesEndDate = new Date(
        stw!.items.find(
          (i) =>
            i.templateId === 'ConditionalAction:generic_instance' &&
            i.attributes.devName === 'MAJOR: Summer - Phoenix',
        )?.attributes?.conditions?.event?.eventEnd ?? '2000-01-01',
      );
      const venturesXP =
        stw!.resources.find((r) => r.templateId === 'AccountResource:phoenixxp')
          ?.quantity ?? 0;
      let lvl = bisect(
        Object.values(venturesData).map((v: any) => v.TotalRequiredXP),
        venturesXP,
      );
      if (lvl === 0) lvl = 1;

      const nextLvl: any = lvl < 50 ? Object.values(venturesData)[lvl] : null;
      // major levels are for eg: 5, 10, 15, 20, 25, 30, 35, 40, 45, 50
      const nextMajorLvl =
        lvl < 50
          ? [5, 10, 15, 20, 25, 30, 35, 40, 45, 50].find((l) => l > lvl) ?? 50
          : null;

      const activePhoenixQuests = stw!.items.filter(
        (i) =>
          i.templateId.startsWith('Quest:phoenix') &&
          i.attributes.quest_state === 'Active',
      );

      const embed = rawEmbed()
        .setTitle(
          `[${stw?.venturesPowerLevel.toFixed(2)}] ${
            player ?? epicAccount.displayName
          }'s STW Ventures Overview`,
        )
        .setDescription(
          `• Season End: ${time(venturesEndDate, 'd')}

• XP: **${venturesXP.toLocaleString()}** ${Emojis.venturexp}
• Level: **${lvl} / 50**${
            nextLvl
              ? `

**${(nextLvl.TotalRequiredXP - venturesXP).toLocaleString()} XP** to next level`
              : ''
          }${
            lvl < 50
              ? `
**${approx(
                  (Object.values(venturesData) as any)[49].TotalRequiredXP -
                    venturesXP,
                ).toUpperCase()} XP** to level 50`
              : ''
          }`,
        );

      if (nextLvl) {
        embed.addField(
          `Rewards for Level ${lvl + 1}`,
          `${nextLvl.VisibleReward.map(
            (r: any) =>
              `${
                (Emojis as any)[r.TemplateId] ??
                stwData[r.TemplateId.split(':')[1]].name
              } **${r.Quantity.toLocaleString()}**`,
          ).join(' ')}`,
          true,
        );
      }

      if (nextMajorLvl) {
        embed.addField(
          `Rewards for Level ${nextMajorLvl}`,
          `${(Object.values(venturesData) as any)[
            nextMajorLvl - 1
          ]?.VisibleReward.map(
            (r: any) =>
              `${
                (Emojis as any)[r.TemplateId] ??
                stwData[r.TemplateId.split(':')[1]].name
              } **${r.Quantity.toLocaleString()}**`,
          ).join(' ')}`,
          true,
        );
      }

      // eslint-disable-next-line no-restricted-syntax
      for (const q of activePhoenixQuests) {
        const questData = stwQuests[q.templateId.split(':')[1].toLowerCase()];

        embed.addField(
          `${questData.name ?? 'Unknown Quest'} (${
            parseInt(
              q.templateId.split('_')[q.templateId.split('_').length - 1],
              10,
            ) ?? 0
          } / 12)`,
          `${questData.objectives
            .map(
              (o: any) =>
                `• ${o.description} **[${(
                  q.attributes[`completion_${o.id}`] ?? 0
                ).toLocaleString()}/${o.count.toLocaleString()}]**`,
            )
            .join('\n')}\n${questData.reward
            .filter((r: any) => !r.hidden)
            .map(
              (r: any) =>
                `${
                  (Emojis as any)[r.id] ?? r.id
                } **${r.quantity.toLocaleString()}x**`,
            )
            .join('\n')}`,
        );
      }

      return embed;
    };

    const createBtns = (disabled = false) => {
      const refreshButton = new MessageButton()
        .setCustomId('refresh')
        .setLabel('Refresh')
        .setStyle('SUCCESS')
        .setDisabled(disabled);

      const closeButton = new MessageButton()
        .setCustomId('close')
        .setLabel('Close')
        .setEmoji(Emojis.cross)
        .setStyle('DANGER')
        .setDisabled(disabled);

      const btns = new MessageActionRow().setComponents(
        refreshButton,
        closeButton,
      );

      return btns;
    };

    let mode = 'stwoverview';
    const createModeMenu = (disabled = false) => {
      const row = new MessageActionRow().addComponents(
        new MessageSelectMenu()
          .setCustomId('mode')
          .setPlaceholder('Select a mode')
          .setOptions([
            {
              label: 'Save the World Overview',
              value: 'stwoverview',
              default: mode === 'stwoverview',
              description: 'View Save the World profile overview.',
            },
            {
              label: 'Save the World Resources',
              value: 'stwresources',
              default: mode === 'stwresources',
              description: 'View Save the World profile resources.',
            },
            {
              label: 'Save the World Ventures',
              value: 'stwventures',
              default: mode === 'stwventures',
              description: 'View Save the World Ventures profile.',
            },
            {
              label: 'Save the World MSK',
              value: 'stwmsk',
              default: mode === 'stwmsk',
              description:
                'View Save the World Mythic Storm King quest/prequest progress.',
            },
            {
              label: 'Save the World Daily Quests',
              value: 'stwdailyquests',
              default: mode === 'stwdailyquests',
              description: 'View Save the World Daily Quests progress.',
            },
          ])
          .setDisabled(disabled),
      );

      return row;
    };

    await interaction.editReply({
      content: ' ',
      embeds: [createSTWOverviewEmbed()],
      components: [createModeMenu(), createBtns()],
    });

    const msg = (await interaction.fetchReply()) as Message;

    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 60 * 60 * 1000,
    });

    collector.on('collect', async (i) => {
      switch (i.customId) {
        case 'refresh':
          await refreshSTWProfile();
          break;

        case 'mode':
          // eslint-disable-next-line prefer-destructuring
          mode = (i as SelectMenuInteraction).values[0];
          break;

        case 'close':
          collector.stop();
          return;
      }

      const embeds: MessageEmbed[] = [];
      const files: MessageAttachment[] = [];

      switch (mode) {
        case 'stwoverview':
          embeds.push(createSTWOverviewEmbed());
          break;

        case 'stwresources':
          files.push(await createSTWResourcesImage());
          embeds.push(createSTWResourcesEmbed());
          break;

        case 'stwventures':
          embeds.push(createSTWVenturesEmbed());
          break;
      }

      await interaction.editReply({
        embeds,
        components: [createModeMenu(), createBtns()],
        files,
      });
    });

    collector.on('end', async (collected, reason) => {
      await interaction
        .editReply({
          // embeds: [createSTWOverviewEmbed()],
          // files: [],
          components: [createModeMenu(true), createBtns(true)],
        })
        .catch(() => {});
    });
  },
};

export default Command;
