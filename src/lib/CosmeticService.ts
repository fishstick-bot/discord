import axios from 'axios';
import { Collection } from 'discord.js';
import type { Types } from 'mongoose';
import { promisify } from 'util';

import Bot from '../client/Client';
import getLogger from '../Logger';
import Exclusives from '../resources/Exclusives.json';
import Crew from '../resources/Crew.json';
import { ICosmetic } from '../database/models/typings';
import { drawLockerItem } from './images/LockerImage';

const wait = promisify(setTimeout);

interface KeyValuePair {
  [key: string]: any;
}

class CosmeticService {
  private bot: Bot;

  public logger = getLogger('COSMETICS SERVICE');

  public cosmetics: Collection<string, ICosmetic> = new Collection();

  constructor(bot: Bot) {
    this.bot = bot;
  }

  public async start() {
    await this.saveCosmetics(await this.getCosmetics());

    setInterval(async () => {
      await this.saveCosmetics(await this.getCosmetics());
    }, 60 * 60 * 1000);
  }

  public async getCosmetics(): Promise<any[]> {
    try {
      const start = Date.now();
      const items = (
        await axios.get('https://fortnite-api.com/v2/cosmetics/br')
      ).data.data as any[];
      this.logger.info(
        `Fetched ${items.length} cosmetics [${(Date.now() - start).toFixed(
          2,
        )}ms]`,
      );
      return items;
    } catch (e: any) {
      this.logger.error(e.response?.data ?? e ?? 'Unknown error');
      await wait(5 * 1000);
      return this.getCosmetics();
    }
  }

  public async saveCosmetics(items: any[]): Promise<void> {
    const start = Date.now();

    // eslint-disable-next-line no-restricted-syntax
    for await (const item of items) {
      await this.saveCosmetic(item);

      if (item.variants && item.variants.length !== 0) {
        await Promise.all(
          item.variants.map(async (v: any) => {
            if (v.options && v.options.length !== 0) {
              await Promise.all(
                v.options.map(async (o: any) => {
                  await this.saveCosmetic({
                    id: `${item.id}-${o.tag}`,
                    name: `${item.name} (${o.name})`,
                    description: item.description,
                    type: {
                      value: 'style',
                      displayValue: 'Style',
                      backendValue: 'style',
                    },
                    rarity: item.rarity,
                    series: item.series,
                    set: item.set,
                    introduction: item.introduction,
                    images: {
                      icon: o.image ?? item.images.icon,
                    },
                    searchTags: item.searchTags,
                    gameplayTags: item.gameplayTags,
                    metaTags: item.metaTags,
                    showcaseVideo: item.showcaseVideo,
                    path: item.path,
                    added: item.added,
                    shopHistory: item.shopHistory,
                    isExclusive: Exclusives.includes(item.id.toLowerCase()),
                    isCrew: Crew.includes(item.id.toLowerCase()),
                  });
                }),
              );
            }
          }),
        );
      }
    }

    this.logger.info(
      `Loaded ${this.cosmetics.size} cosmetics [${(Date.now() - start).toFixed(
        2,
      )}ms]`,
    );
  }

  public async saveCosmetic(item: any): Promise<void> {
    if (this.cosmetics.has(item.id?.toLowerCase())) return;

    const cosmeticsModel = this.bot.cosmeticModel;

    try {
      const cosmetic = await cosmeticsModel
        .findOne({
          id: item.id,
        })
        .populate('type')
        .populate('rarity')
        .populate('series')
        .populate('set')
        .populate('introduction')
        .lean()
        .exec();

      if (!cosmetic) {
        this.logger.warn(`${item.name} not found in database.`);

        const c: any = {
          id: item.id,
          name: item.name,
          description: item.description,
          type: await this._getCosmeticType({
            value: item.type.value,
            displayValue: item.type.displayValue,
            backendValue: item.type.backendValue,
          }),
          rarity: await this._getCosmeticRarity({
            value: item.rarity.value,
            displayValue: item.rarity.displayValue,
            backendValue: item.rarity.backendValue,
          }),
          series: item.series
            ? await this._getCosmeticSeries({
                value: item.series.value,
                displayValue: item.series.displayValue,
                backendValue: item.series.backendValue,
              })
            : null,
          set: item.set
            ? await this._getCosmeticSet({
                value: item.set.value ?? item.set.backendValue,
                text: item.set.text ?? item.set.backendValue,
                backendValue: item.set.backendValue,
              })
            : null,
          introduction: item.introduction
            ? await this._getCosmeticIntroducedIn({
                chapter: item.introduction.chapter,
                season: item.introduction.season,
                text: item.introduction.text,
                seasonNumber: item.introduction.backendValue,
              })
            : null,
          searchTags: item.searchTags ?? [],
          gameplayTags: item.gameplayTags ?? [],
          metaTags: item.metaTags ?? [],
          showcaseVideo: item.showcaseVideo ?? null,
          path: item.path,
          addedAt: item.added,
          shopHistory: item.shopHistory ? item.shopHistory : [],
          isExclusive: Exclusives.includes(item.id.toLowerCase()),
          isCrew: Crew.includes(item.id.toLowerCase()),
        };

        await cosmeticsModel.create({
          ...c,
          image: await drawLockerItem({
            id: c.id.toLowerCase(),
            name: c.name,
            description: c.description,
            type: item.type.value,
            rarity: item.rarity.value,
            series: item.series ? item.series.value : null,
            set: item.set ? item.set.value : null,
            introduction: c.introduction
              ? {
                  chapter: item.introduction.chapter,
                  season: item.introduction.season,
                  text: item.introduction.text,
                  seasonNumber: item.introduction.backendValue,
                }
              : null,
            isExclusive: c.isExclusive,
            isCrew:
              c.isCrew ||
              c.gameplayTags.filter((t: string) =>
                t.toLowerCase().includes('crewpack'),
              ).length > 0,
            isSTW:
              c.gameplayTags.filter(
                (t: string) =>
                  t.toLowerCase().includes('savetheworld') ||
                  t.toLowerCase().includes('stw'),
              ).length > 0,
            isBattlePass:
              c.gameplayTags.filter((t: string) =>
                t.toLowerCase().includes('battlepass.paid'),
              ).length > 0,
            isFreePass:
              c.gameplayTags.filter((t: string) =>
                t.toLowerCase().includes('battlepass.free'),
              ).length > 0,
            isItemShop:
              c.gameplayTags.filter((t: string) =>
                t.toLowerCase().includes('itemshop'),
              ).length > 0,
            isPlaystation:
              c.gameplayTags.filter((t: string) =>
                t.toLowerCase().includes('platform.ps4'),
              ).length > 0,
            isXbox:
              c.gameplayTags.filter((t: string) =>
                t.toLowerCase().includes('platform.xbox'),
              ).length > 0,
            isPromo:
              c.gameplayTags.filter((t: string) =>
                t.toLowerCase().includes('source.promo'),
              ).length > 0,
            image: item.images.icon ?? item.images.smallIcon,
          }),
        });

        const createdCosmetic = (await cosmeticsModel
          .findOne({
            id: item.id,
          })
          .populate('type')
          .populate('rarity')
          .populate('series')
          .populate('set')
          .populate('introduction')
          .lean()
          .exec())!;
        this.cosmetics.set(item.id.toLowerCase(), createdCosmetic);
      } else {
        this.cosmetics.set(cosmetic.id.toLowerCase(), cosmetic);
      }
    } catch (e) {
      this.logger.error(e);
    }
  }

  private async _getCosmeticType(
    value: KeyValuePair,
    retry = true,
  ): Promise<Types.ObjectId> {
    const typesModel = this.bot.cosmeticTypeModel;

    const type = await typesModel
      .findOne({
        value: value.value,
      })
      .lean()
      .exec();
    if (!type) {
      try {
        return (await typesModel.create(value))._id;
      } catch (e) {
        this.logger.error(e);

        if (retry) {
          return this._getCosmeticType(value, false);
        }
      }
    }

    return type!._id;
  }

  private async _getCosmeticRarity(
    value: KeyValuePair,
    retry = true,
  ): Promise<Types.ObjectId> {
    const raritiesModel = this.bot.cosmeticRarityModel;

    const rarity = await raritiesModel
      .findOne({
        value: value.value,
      })
      .lean()
      .exec();
    if (!rarity) {
      try {
        return (await raritiesModel.create(value))._id;
      } catch (e) {
        this.logger.error(e);

        if (retry) {
          return this._getCosmeticRarity(value, false);
        }
      }
    }

    return rarity!._id;
  }

  private async _getCosmeticSeries(
    value: KeyValuePair,
    retry = true,
  ): Promise<Types.ObjectId> {
    const seriesModel = this.bot.cosmeticSeriesModel;

    const series = await seriesModel
      .findOne({
        value: value.value,
      })
      .lean()
      .exec();
    if (!series) {
      try {
        return (await seriesModel.create(value))._id;
      } catch (e) {
        this.logger.error(e);

        if (retry) {
          return this._getCosmeticSeries(value, false);
        }
      }
    }

    return series!._id;
  }

  private async _getCosmeticSet(
    value: KeyValuePair,
    retry = true,
  ): Promise<Types.ObjectId> {
    const setsModel = this.bot.cosmeticSetModel;

    const set = await setsModel
      .findOne({
        value: value.value,
      })
      .lean()
      .exec();
    if (!set) {
      try {
        return (await setsModel.create(value))._id;
      } catch (e) {
        this.logger.error(e);

        if (retry) {
          return this._getCosmeticSet(value, false);
        }
      }
    }

    return set!._id;
  }

  private async _getCosmeticIntroducedIn(
    value: KeyValuePair,
    retry = true,
  ): Promise<Types.ObjectId> {
    const introducedInModel = this.bot.cosmeticIntroducedInModel;

    const introducedIn = await introducedInModel
      .findOne({
        seasonNumber: value.seasonNumber,
      })
      .lean()
      .exec();
    if (!introducedIn) {
      try {
        return (await introducedInModel.create(value))._id;
      } catch (e) {
        this.logger.error(e);

        if (retry) {
          return this._getCosmeticIntroducedIn(value, false);
        }
      }
    }

    return introducedIn!._id;
  }
}

export default CosmeticService;
