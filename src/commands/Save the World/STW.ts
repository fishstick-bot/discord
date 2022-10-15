/* eslint-disable no-param-reassign */
import {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  SelectMenuBuilder,
  ActionRowBuilder,
  Message,
  AttachmentBuilder,
  SelectMenuInteraction,
  SlashCommandBuilder,
  time,
  strikethrough,
} from 'discord.js';
import type { STWProfile } from 'fnbr';
import { promises as fs } from 'fs';
// @ts-ignore
import approx from 'approximate-number';

import type { ICommand } from '../../structures/Command';
import type { IEpicAccount } from '../../database/models/typings';
import type ISTWMission from '../../structures/STWMission';
import Emojis from '../../resources/Emojis';
import Sort from '../../lib/Sort';
import drawSTWResources from '../../lib/Images/STWResources';
import getLogger from '../../Logger';
import { handleCommandError } from '../../lib/Utils';

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
    let psn: string | null = null;
    let xbl: string | null = null;
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
      psn = playerAccount.psn;
      xbl = playerAccount.xbl;
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
    const stwSurvivorBonuses = JSON.parse(
      await fs.readFile('assets/SurvivorSquadBonuses.json', 'utf-8'),
    );
    const venturesData = JSON.parse(
      await fs.readFile('assets/PhoenixLevelRewardsTable.json', 'utf-8'),
    );
    const stwQuests = JSON.parse(
      await fs.readFile('assets/STWQuests.json', 'utf-8'),
    );
    const stwMissions = (
      await client.http.send(
        'GET',
        `http://127.0.0.1:${bot._config.apiPort}/api/stwMissions`,
      )
    ).response.data as ISTWMission[];

    const rawEmbed = () => {
      const embed = new EmbedBuilder()
        .setAuthor({
          name: `${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL(),
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

    const getSTWStats = () => {
      const mfa = stw!.stats.mfaRewardClaimed;
      let backpackSize = 50;
      let storageSize = 0;
      let researchPoints = 0;
      const survivorSquadBonuses: {
        [key: string]: any;
      } = {};
      Object.values(stw?.survivorSquads!).forEach((squad) => {
        const squadBonus: {
          [key: string]: number;
        } = {};
        squad.forEach((s: any) => {
          if (s.setBonus) {
            if (!squadBonus[s.setBonus]) {
              squadBonus[s.setBonus] = 0;
            }
            squadBonus[s.setBonus] += 1;
          }
        });
        Object.keys(squadBonus).forEach((bonus) => {
          if (!survivorSquadBonuses[bonus]) {
            survivorSquadBonuses[bonus] = 0;
          }
          survivorSquadBonuses[bonus] +=
            Math.floor(
              squadBonus[bonus] / stwSurvivorBonuses[bonus].minimumSurvivors,
            ) * parseInt(stwSurvivorBonuses[bonus].bonus, 10);
        });
      });
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

      return {
        mfa,
        survivorSquadBonuses,
        backpackSize,
        storageSize,
        researchPoints,
        ssds,
        endurances,
        brxp,
      };
    };

    const createSTWOverviewEmbed = () => {
      const {
        mfa,
        backpackSize,
        storageSize,
        researchPoints,
        ssds,
        endurances,
        brxp,
        survivorSquadBonuses,
      } = getSTWStats();

      const embed = rawEmbed()
        .setDescription(
          `${psn ? `• ${Emojis.psn} **${psn}**\n` : ''}${
            xbl ? `• ${Emojis.xbl} **${xbl}**\n` : ''
          }• Account Level: **${(
            stw?.stats.actualLevel ??
            stw?.stats.level ??
            0
          ).toLocaleString()}**
• Backpack Size: **${backpackSize}**
• Storage Size: **${storageSize}**
• Zones Completed: **${(stw?.stats.matchesPlayed ?? 0).toLocaleString()}**
• Collection Book Level: **${(
            stw?.stats.collectionBookMaxXPLevel ?? 0
          )?.toLocaleString()}**
• Unslot Cost: **${(stw?.stats.unslotMtxSpend ?? 0).toLocaleString()}**
• FORT Stats: **${Object.keys(stw?.FORTStats!)
            .map(
              (s) =>
                `${(Emojis as any)[s]!} ${(stw?.FORTStats! as any)[
                  s
                ].toLocaleString()}`,
            )
            .join(' ')}**
• Research: **${Object.keys(
            (stw?.stats.researchLevels ?? {
              fortitude: 0,
              resistance: 0,
              offense: 0,
              tech: 0,
            })!,
          )
            .map(
              (s) =>
                `${(Emojis as any)[s]!} ${
                  (
                    (stw?.stats.researchLevels ?? {
                      fortitude: 0,
                      resistance: 0,
                      offense: 0,
                      tech: 0,
                    })! as any
                  )[s]
                }`,
            )
            .join(' ')} ${Emojis.research} ${researchPoints.toLocaleString()}**
• ${Object.keys(survivorSquadBonuses)
            .map(
              (b) => `${(Emojis as any)[b]!} **+${survivorSquadBonuses[b]}%**`,
            )
            .join(' ')}`,
        )
        .addFields([
          {
            name: 'SSD Completions',
            value: Object.keys(ssds)
              .map((s) => `• ${s}: **${ssds[s]}**`)
              .join('\n'),
            inline: true,
          },
        ])
        .addFields([
          {
            name: 'Endurance Completions',
            value: Object.keys(endurances)
              .map(
                (s) =>
                  `• ${s}: ${
                    endurances[s]
                      ? `${time((endurances[s] as Date)!, 'd')}`
                      : '**Not Completed**'
                  }`,
              )
              .join('\n'),
            inline: true,
          },
        ])
        .addFields([
          {
            name: 'Battle Royale Accolade XP',
            value: `**${(
              brxp ?? 0
            ).toLocaleString()} / ${(450000).toLocaleString()} ${
              Emojis.brxp
            }**`,
          },
        ]);
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

      const attachment = new AttachmentBuilder(
        await drawSTWResources(
          Sort(resources),
          player ?? epicAccount.displayName,
          interaction.user.tag,
        ),
        { name: 'stw-resources.png' },
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
        embed.addFields([
          {
            name: `Rewards for Level ${lvl + 1}`,
            value: `${nextLvl.VisibleReward.map(
              (r: any) =>
                `${
                  (Emojis as any)[r.TemplateId] ??
                  stwData[r.TemplateId.split(':')[1]].name
                } **${r.Quantity.toLocaleString()}**`,
            ).join(' ')}`,
            inline: true,
          },
        ]);
      }

      if (nextMajorLvl) {
        embed.addFields([
          {
            name: `Rewards for Level ${nextMajorLvl}`,
            value: `${(Object.values(venturesData) as any)[
              nextMajorLvl - 1
            ]?.VisibleReward.map(
              (r: any) =>
                `${
                  (Emojis as any)[r.TemplateId] ??
                  stwData[r.TemplateId.split(':')[1]].name
                } **${r.Quantity.toLocaleString()}**`,
            ).join(' ')}`,
            inline: true,
          },
        ]);
      }

      // eslint-disable-next-line no-restricted-syntax
      for (const q of activePhoenixQuests) {
        const questData = stwQuests[q.templateId.split(':')[1].toLowerCase()];

        embed.addFields([
          {
            name: `${questData.name ?? 'Unknown Quest'} (${
              parseInt(
                q.templateId.split('_')[q.templateId.split('_').length - 1],
                10,
              ) ?? 0
            } / 12)`,
            value: `${questData.objectives
              .map((o: any) => {
                const completed =
                  (q.attributes[`completion_${o.id}`] ?? 0) === o.count;
                let task = o.description.split(' in a [UIRating]+')[0];
                if (completed) {
                  task = strikethrough(task);
                }
                return `• ${task} **[${(
                  q.attributes[`completion_${o.id}`] ?? 0
                ).toLocaleString()}/${o.count.toLocaleString()}]**`;
              })
              .join('\n')}\n${questData.reward
              .filter((r: any) => !r.hidden)
              .map(
                (r: any) =>
                  `${
                    (Emojis as any)[r.id] ?? r.id
                  } **${r.quantity.toLocaleString()}x**`,
              )
              .join('\n')}`,
          },
        ]);
      }

      return embed;
    };

    const createSTWMskEmbed = () => {
      const mskSchematics = {} as {
        [key: string]: number;
      };
      const schematics = stw!.weaponSchematics.filter((i) =>
        i.templateId.includes('_stormking_'),
      );
      // eslint-disable-next-line no-restricted-syntax
      for (const s of schematics) {
        const parsedTemplateId = s.templateId
          .split(':')[1]
          .split('_stormking_')[0]
          .split('sid_')[1];
        if (!mskSchematics[parsedTemplateId])
          mskSchematics[parsedTemplateId] = 1;
        else mskSchematics[parsedTemplateId] += 1;
      }

      const embed = rawEmbed().setTitle(
        `[${stw?.powerLevel.toFixed(2)}] ${
          player ?? epicAccount.displayName
        }'s STW Mythic Storm King`,
      );

      const quest = stw!.items.find(
        (i) =>
          i.templateId.includes('Quest:stw_stormkinghard') &&
          i.attributes.quest_state === 'Active',
      );

      if (!quest) {
        embed.setDescription(
          `No active Storm King quest found.
${Object.keys(mskSchematics)
  .map(
    (s) =>
      `${(Emojis as any)[s] ?? s} **${mskSchematics[s].toLocaleString()}x**`,
  )
  .join(' ')}`,
        );
      } else {
        const questData =
          stwQuests[quest.templateId.split(':')[1].toLowerCase()];

        embed.setDescription(
          `**${questData.name}**
${questData.description}
${questData.objectives
  .map(
    (o: any) =>
      `• ${o.description} **[${quest.attributes[`completion_${o.id}`] ?? 0}/${
        o.count
      }]**`,
  )
  .join('\n')}
${questData.reward
  .filter((r: any) => !r.hidden && !r.id.includes('Quest'))
  .map(
    (r: any) =>
      `${(Emojis as any)[r.id] ?? r.id} **${r.quantity.toLocaleString()}x**`,
  )
  .join(' ')}
  
${Object.keys(mskSchematics)
  .map(
    (s) =>
      `${(Emojis as any)[s] ?? s} **${mskSchematics[s].toLocaleString()}x**`,
  )
  .join(' ')}`,
        );
      }

      return embed;
    };

    const createSTWDailyQuestsEmbed = () => {
      const quests = stw!.items.filter(
        (i) =>
          i.templateId.startsWith('Quest:daily') &&
          i.attributes.quest_state === 'Active',
      );

      const embed = rawEmbed().setTitle(
        `[${stw?.powerLevel.toFixed(2)}] ${
          player ?? epicAccount.displayName
        }'s STW Daily Quests`,
      );

      if (quests.length === 0) {
        embed.setDescription(`No active daily quests found.`);
      } else {
        // eslint-disable-next-line no-restricted-syntax
        for (const q of quests) {
          const questData = stwQuests[q.templateId.split(':')[1].toLowerCase()];

          embed.addFields([
            {
              name: `${questData.name ?? 'Unknown Quest'}`,
              value: `${questData.objectives
                .map((o: any) => {
                  const completed =
                    (q.attributes[`completion_${o.id}`] ?? 0) === o.count;
                  let task = o.description;
                  if (completed) {
                    task = strikethrough(task);
                  }
                  return `• ${task} **[${(
                    q.attributes[`completion_${o.id}`] ?? 0
                  ).toLocaleString()}/${o.count.toLocaleString()}]**`;
                })
                .join('\n')}
${questData.reward
  .filter((r: any) => !r.hidden)
  .map(
    (r: any) =>
      `${(Emojis as any)[r.id] ?? r.id} **${r.quantity.toLocaleString()}x**`,
  )
  .join(' ')}`,
            },
          ]);
        }
      }

      return embed;
    };

    const createSTWWeeklyQuestsEmbed = () => {
      const quests = stw!.items.filter(
        (i) =>
          i.templateId.startsWith('Quest:weekly') &&
          i.attributes.quest_state === 'Active',
      );

      const embed = rawEmbed().setTitle(
        `[${stw?.powerLevel.toFixed(2)}] ${
          player ?? epicAccount.displayName
        }'s STW Weekly Quests`,
      );

      if (quests.length === 0) {
        embed.setDescription(`No active weekly quests found.`);
      } else {
        // eslint-disable-next-line no-restricted-syntax
        for (const q of quests) {
          const questData = stwQuests[q.templateId.split(':')[1].toLowerCase()];

          embed.addFields([
            {
              name: `${questData.name ?? 'Unknown Quest'}`,
              value: `${questData.objectives
                .map((o: any) => {
                  const completed =
                    (q.attributes[`completion_${o.id}`] ?? 0) === o.count;
                  let task = o.description;
                  if (q.templateId.toLowerCase().includes('supercharge')) {
                    task = task.replace('[UIRating]', '160');
                  }
                  if (completed) {
                    task = strikethrough(task);
                  }
                  return `• ${task} **[${(
                    q.attributes[`completion_${o.id}`] ?? 0
                  ).toLocaleString()}/${o.count.toLocaleString()}]**`;
                })
                .join('\n')}
${questData.reward
  .filter((r: any) => !r.hidden)
  .map(
    (r: any) =>
      `${(Emojis as any)[r.id] ?? r.id} **${r.quantity.toLocaleString()}x**`,
  )
  .join(' ')}`,
            },
          ]);
        }
      }

      return embed;
    };

    const createSTWCompletedAlertsEmbed = () => {
      if (stwMissions.length === 0) {
        throw new Error('No STW missions found in bot data.');
      }

      const completed =
        (
          stw?.stats.missionAlertRedemptionRecord?.map((a) => ({
            alert: stwMissions.find((m) => m.id === a.missionAlertId),
            time: a.evictClaimDataAfterUtc,
          })) ?? []
        ).filter((a) => a && a.alert !== undefined) ?? [];

      const embeds = [];

      if (completed.length === 0) {
        return [
          rawEmbed()
            .setTitle(
              `[${stw?.powerLevel.toFixed(2)}] ${
                player ?? epicAccount.displayName
              }'s STW Completed Alerts`,
            )
            .setDescription(`No completed alerts found.`),
        ];
      }

      for (let i = 0; i < completed.length; i += 10) {
        const embed = rawEmbed().setTitle(
          `[${stw?.powerLevel.toFixed(2)}] ${
            player ?? epicAccount.displayName
          }'s STW Completed Alerts`,
        );
        embed.setDescription(
          completed
            .slice(i, i + 10)
            .map(
              (a) =>
                `• ~~**[${a.alert!.powerLevel}] ${a.alert!.missionType}**~~
${a.alert!.area}
${a
  .alert!.rewards.filter((r) => !r.repeatable)
  .map(
    (r) => `${(Emojis as any)[r.id] ?? r.id} **${r.amount.toLocaleString()}x**`,
  )
  .join(' ')}`,
            )
            .join('\n\n'),
        );

        embeds.push(embed);
      }

      return embeds;
    };

    const createBtns = (disabled = false) => {
      const refreshButton = new ButtonBuilder()
        .setCustomId('refresh')
        .setLabel('Refresh')
        .setStyle(ButtonStyle.Success)
        .setDisabled(disabled);

      const closeButton = new ButtonBuilder()
        .setCustomId('close')
        .setLabel('Close')
        .setEmoji(Emojis.cross)
        .setStyle(ButtonStyle.Danger)
        .setDisabled(disabled);

      const btns = new ActionRowBuilder<ButtonBuilder>().setComponents(
        refreshButton,
        closeButton,
      );

      return btns;
    };

    let mode = 'stwoverview';
    const createModeMenu = (disabled = false) => {
      const row = new ActionRowBuilder<SelectMenuBuilder>().addComponents(
        new SelectMenuBuilder()
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
            {
              label: 'Save the World Weekly Quests',
              value: 'stwweeklyquests',
              default: mode === 'stwweeklyquests',
              description: 'View Save the World Weekly Quests progress.',
            },
            {
              label: 'Save the World Completed Alerts',
              value: 'stwcompletedalerts',
              default: mode === 'stwcompletedalerts',
              description:
                'View Save the World Completed Mission Alerts for the day.',
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
      try {
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

        const embeds: EmbedBuilder[] = [];
        const files: AttachmentBuilder[] = [];

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

          case 'stwmsk':
            embeds.push(createSTWMskEmbed());
            break;

          case 'stwdailyquests':
            embeds.push(createSTWDailyQuestsEmbed());
            break;

          case 'stwweeklyquests':
            embeds.push(createSTWWeeklyQuestsEmbed());
            break;

          case 'stwcompletedalerts':
            embeds.push(...createSTWCompletedAlertsEmbed());
            break;
        }

        await msg.edit({
          embeds,
          components: [createModeMenu(), createBtns()],
          files,
        });
      } catch (e) {
        await handleCommandError(
          bot,
          user,
          getLogger('COMMAND'),
          interaction,
          e,
        );
        collector.stop('handleError');
      }
    });

    collector.on('end', async (collected, reason) => {
      if (reason === 'handleError') return;
      await interaction
        .editReply({
          components: [createModeMenu(true), createBtns(true)],
        })
        .catch(() => {});
    });
  },
};

export default Command;
