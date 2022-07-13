/* eslint-disable no-nested-ternary */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-restricted-globals */
/* eslint-disable no-restricted-syntax */
import axios from 'axios';
import * as fs from 'fs';
import { promisify } from 'util';
import cron from 'node-cron';
import { Endpoints, STWWorldInfoData } from 'fnbr';
import { MessageEmbed, TextChannel } from 'discord.js';

import Service from '../../structures/Service';
import Bot from '../../client/Client';
import getLogger from '../../Logger';
// import STWItems from '../../assets/STW.json';
import Modifiers from '../../resources/STWModifiers.json';
import STWMissionTypes from '../../resources/STWMissionTypes.json';
import STWBiomes from '../../resources/STWBiomes.json';
import ISTWMission from '../../structures/STWMission';
import STWMissionImages from '../../resources/STWMissionImages';
import Emojis from '../../resources/Emojis';

interface KeyValuePair {
  [key: string]: any;
}

let STWItems: KeyValuePair = {};

const modifiers: KeyValuePair = {};
Object.keys(Modifiers).forEach((key) => {
  modifiers[key.toLowerCase()] = (Modifiers as KeyValuePair)[key];
});

const wait = promisify(setTimeout);

class STWMissionsService implements Service {
  private bot: Bot;

  private logger = getLogger('STW MISSIONS SERVICE');

  private _rawMissionData: STWWorldInfoData;
  public missions: ISTWMission[];

  constructor(bot: Bot) {
    this.bot = bot;

    this._rawMissionData = {
      theaters: [],
      missions: [],
      missionAlerts: [],
    };
    this.missions = [];
  }

  public async start() {
    STWItems = JSON.parse(
      await fs.promises.readFile('./assets/STW.json', 'utf-8'),
    );

    await this.fetchMissions();

    cron.schedule(
      '1 0 * * *',
      async () => {
        await this.fetchMissions();

        const { mtxAlerts, legendarySurvivorAlerts } = this;

        if (mtxAlerts.length > 0) {
          const embed = new MessageEmbed()
            .setColor(this.bot._config.color)
            .setTimestamp()
            .setTitle('Save the World Mission Alerts')
            .setAuthor({
              name: 'V-Bucks Alerts',
            })
            .setDescription(this.formatMissions(mtxAlerts))
            .setFooter({
              text: `${mtxAlerts
                .map(
                  (m) =>
                    m.rewards.find(
                      (r) => r.id === 'AccountResource:currency_mtxswap',
                    )?.amount ?? 0,
                )
                .reduce((a, b) => a + b, 0)} V-Bucks today`,
            });

          for await (const guild of this.bot.guildModel.find({
            vbucksAlertsChannelId: { $ne: '' },
          })) {
            await this.postToChannel(guild.vbucksAlertsChannelId, ' ', [embed]);
          }
        }

        if (legendarySurvivorAlerts.length > 0) {
          const embed = new MessageEmbed()
            .setColor(this.bot._config.color)
            .setTimestamp()
            .setTitle('Save the World Mission Alerts')
            .setAuthor({
              name: 'Legendary Survivor Alerts',
            })
            .setDescription(this.formatMissions(legendarySurvivorAlerts))
            .setFooter({
              text: `${legendarySurvivorAlerts.length} Legendary Survivors today`,
            });

          for await (const guild of this.bot.guildModel.find({
            legendarySurvivorAlertsChannelId: { $ne: '' },
          })) {
            await this.postToChannel(
              guild.legendarySurvivorAlertsChannelId,
              ' ',
              [embed],
            );
          }
        }
      },
      {
        scheduled: true,
        timezone: 'Etc/UTC',
      },
    );
  }

  public get mtxAlerts(): ISTWMission[] {
    return this.missions.filter((m) =>
      m.rewards.some((r) => r.id === 'AccountResource:currency_mtxswap'),
    );
  }

  public get totalMtx(): number {
    return this.mtxAlerts
      .map(
        (m) =>
          m.rewards.find((r) => r.id === 'AccountResource:currency_mtxswap')!
            .amount,
      )
      .reduce((a, b) => a + b, 0);
  }

  public get legendarySurvivorAlerts(): ISTWMission[] {
    return this.missions.filter((m) =>
      m.rewards.some((r) => r.id === 'Worker:workerbasic_sr_t01'),
    );
  }

  private async fetchMissions(): Promise<ISTWMission[]> {
    let start = Date.now();
    try {
      const tokenRes = (
        await axios.post(
          Endpoints.OAUTH_TOKEN_CREATE,
          `grant_type=client_credentials`,
          {
            headers: {
              Authorization:
                'basic MzQ0NmNkNzI2OTRjNGE0NDg1ZDgxYjc3YWRiYjIxNDE6OTIwOWQ0YTVlMjVhNDU3ZmI5YjA3NDg5ZDMxM2I0MWE=',
              'Content-TYpe': 'application/x-www-form-urlencoded',
            },
          },
        )
      ).data;
      const accessToken = tokenRes.access_token;
      this.logger.info(
        `Fetched client credentials token [${(Date.now() - start).toFixed(
          2,
        )}ms]`,
      );

      start = Date.now();
      this._rawMissionData = (
        await axios.get(Endpoints.STW_WORLD_INFO, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
      ).data;
      this.logger.info(
        `Fetched mission data [${(Date.now() - start).toFixed(2)}ms]`,
      );

      start = Date.now();
      const keyedTiles = this._getKeyedTiles();
      const keyedMissionAlerts = this._getKeyedMissionAlerts();

      // Iterate over the missions and parse them
      const missions: ISTWMission[] = [];

      for (const missionGroup of this._rawMissionData.missions ?? []) {
        const { theaterId } = missionGroup;

        for (const missionData of missionGroup.availableMissions) {
          const mission = this._parseMission(
            keyedMissionAlerts,
            keyedTiles,
            theaterId,
            missionData,
          );

          if (mission.show) missions.push(mission);
        }
      }

      this.missions = missions;
      this.missions.sort((a, b) => a.powerLevel - b.powerLevel);
      this.logger.info(
        `Parsed mission data [${(Date.now() - start).toFixed(2)}ms]`,
      );

      return this.missions;
    } catch (e) {
      this.logger.error(e);

      await wait(30 * 1000);
      return this.fetchMissions();
    }
  }

  private _getKeyedMissionAlerts(): KeyValuePair {
    const keyedMissionAlerts = {} as KeyValuePair;

    for (const rawGroup of this._rawMissionData.missionAlerts ?? []) {
      const { theaterId } = rawGroup;
      keyedMissionAlerts[theaterId] = {};

      for (const rawAlert of rawGroup.availableMissionAlerts ?? []) {
        // eslint-disable-next-line no-shadow
        const modifiers = rawAlert.missionAlertModifiers?.items ?? null;
        const rewards = rawAlert.missionAlertRewards.items;

        keyedMissionAlerts[theaterId][rawAlert.tileIndex] = {
          modifiers,
          rewards,
          missionAlertId: rawAlert.missionAlertGuid,
        };
      }
    }

    return keyedMissionAlerts;
  }

  private _getKeyedTiles(): KeyValuePair {
    const keyedTiles = {} as KeyValuePair;

    for (const rawTheater of this._rawMissionData.theaters) {
      const isHiddenTheater =
        rawTheater.bHideLikeTestTheater || rawTheater.bIsTestTheater;

      const theaterName = (rawTheater.displayName as any).en;
      const theaterId = rawTheater.uniqueId;
      keyedTiles[theaterId] = {};

      for (const rawTile of rawTheater.tiles) {
        const tileIi = rawTheater.tiles.indexOf(rawTile);
        keyedTiles[theaterId][tileIi] = {
          theaterName,
          isHiddenTheater,
          zoneTheme: rawTile.zoneTheme,
        };
      }
    }

    return keyedTiles;
  }

  private _missionLevelFromTierGroupName(tierGroupName: string = ''): any[] {
    // Special Cases
    if (tierGroupName === 'Mission_Select_Tutorial') return [1, false];

    // Mission with tier specified
    const patterns: any = [
      [/Mission_Select_T(\d+)/, false],
      [/Mission_Select_Phoenix_T(\d+)/, false],
      [/Mission_Select_Group_T(\d+)/, true],
      [/Mission_Select_Phoenix_Group_T(\d+)/, true],
    ];

    for (const [pattern, isGroupMission] of patterns) {
      const match = parseInt(
        tierGroupName.match(pattern)?.[0]?.split?.('_T')?.[1] ?? '',
        10,
      );

      if (!isNaN(match))
        return [this._missionLevelFromTier(match), isGroupMission];
    }

    // Stormshield
    const match = /Outpost_Select_Theater(\d)/.test(tierGroupName);
    if (match) return [1, false];

    return [1, false];
  }

  private _missionLevelFromTier(tier: number = 1): number | null {
    if (tier <= 0) return null;

    const levelsByTier = [
      1, 3, 5, 9, 15, 19, 23, 28, 34, 40, 46, 52, 58, 64, 70, 76, 82, 88, 94,
      100, 108, 116, 124, 132, 140, 160,
    ];

    const level = levelsByTier[tier - 1];
    return level;
  }

  private _parseReward(
    rawReward: KeyValuePair = {},
    repeatable = false,
  ): KeyValuePair {
    const templateId = rawReward.itemType;
    const type = templateId.split(':')[0];
    const partialId = templateId.split(':')[1];

    let name = partialId;
    let rarity = 'common';

    const found = (STWItems as KeyValuePair)[partialId];

    if (found) {
      name = found.name;
      rarity = found.rarity;
    }

    return {
      id: templateId,
      amount: rawReward.quantity,
      repeatable,
      name,
      rarity,
    };
  }

  private _parseMission(
    keyedMissionAlerts: KeyValuePair = {},
    keyedTiles: KeyValuePair = {},
    theaterId: any = {},
    missionData: KeyValuePair = {},
  ) {
    const { tileIndex } = missionData;
    const tile = keyedTiles[theaterId]?.[tileIndex];

    // Mission Type
    const generator = missionData.missionGenerator || '';
    let missionType: any = null;
    for (const [key, value] of Object.entries(STWMissionTypes)) {
      for (const pattern of value.missionGeneratorPatterns) {
        if (generator.includes(pattern)) {
          missionType = value;
        }
      }
    }
    if (!missionType)
      missionType = {
        name: 'Unknown Mission',
        show: false,
        imageUrl: '',
      };
    missionType = {
      show: true,
      name: missionType.name,
      imageUrl: missionType.imageUrl,
    };

    let biome: any = null;
    for (const [key, value] of Object.entries(STWBiomes)) {
      for (const pattern of value.zoneThemePatterns) {
        if (tile.zoneTheme && tile.zoneTheme.includes(pattern)) {
          biome = value;
        }
      }
    }
    if (!biome)
      biome = {
        name: 'Unknown Biome',
      };
    biome = {
      name: biome.name,
    };

    // Power level
    const tierGroupName = missionData.missionRewards?.tierGroupName;
    const [powerLevel, isGroupMission] =
      this._missionLevelFromTierGroupName(tierGroupName);

    // Base Rewards
    const parsedRewards: any[] = [];
    for (const rawReward of missionData.missionRewards?.items ?? []) {
      parsedRewards.push(this._parseReward(rawReward, true));
    }

    // Mission alerts
    const rawAlert = keyedMissionAlerts[theaterId]?.[tileIndex];
    const parsedModifiers: any[] = [];

    for (const rawReward of rawAlert?.rewards ?? []) {
      parsedRewards.push(this._parseReward(rawReward, false));
    }

    for (const rawModifier of rawAlert?.modifiers ?? []) {
      const modifierId = rawModifier.itemType;
      const modifierPartialId = modifierId.split(':')[1];
      parsedModifiers.push({
        id: modifierId,
        name: modifiers[modifierPartialId]?.name ?? modifierPartialId,
        description: modifiers[modifierPartialId]?.description ?? '',
        icon:
          modifiers[modifierPartialId]?.id !== undefined
            ? `${modifiers[modifierPartialId]?.id}`
            : null,
      });
    }

    // Done
    return {
      id: rawAlert
        ? rawAlert.missionAlertId
          ? rawAlert.missionAlertId
          : ''
        : missionData.missionGuid
        ? missionData.missionGuid
        : '',
      show: missionType.show && !tile.isHiddenTheater,
      missionType: missionType.name,
      icon:
        (STWMissionImages as KeyValuePair)[missionType.name]?.[
          isGroupMission ? 'normal' : 'group'
        ] ?? 'T-Icon-Unknown-128.png',
      area: tile.theaterName,
      biome: biome.name,
      powerLevel,
      isGroupMission,
      modifiers: parsedModifiers,
      rewards: parsedRewards,
    };
  }

  private formatMissions(missions: ISTWMission[]) {
    return missions
      .map(
        (m) => `• **[${m.powerLevel}] ${m.missionType}${
          m.show ? '' : ' (Hidden)'
        }**
${m.biome} - ${m.area}
${m.rewards
  .map(
    (r) =>
      `**${
        (Emojis as any)[r.id] ?? (Emojis as any)[r.name] ?? r.name
      } ${r.amount.toLocaleString()}x ${
        r.repeatable ? '' : ' (Alert Reward)'
      }**`,
  )
  .join('\n')}`,
      )
      .join('\n\n');
  }

  private async postToChannel(
    channelId: string,
    message: string,
    embeds: MessageEmbed[],
  ) {
    try {
      const channel = (await this.bot.channels.fetch(channelId)) as TextChannel;

      if (channel) {
        await channel
          .send({
            content: message,
            embeds,
          })
          .catch(() => {});
      }
    } catch (e) {
      this.logger.error(`Error posting to channel ${channelId}: ${e}`);
    }
  }
}

export default STWMissionsService;
