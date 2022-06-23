import axios from 'axios';
import { Collection } from 'discord.js';
import { Types } from 'mongoose';
import { promisify } from 'util';

import Bot from '../client/Client';
import { ICosmetic } from '../database/models/typings';

const wait = promisify(setTimeout);

interface KeyValuePair {
    [key: string]: any;
}

class CosmeticService {
  private bot: Bot;

  public cosmetics: Collection<string, ICosmetic> = new Collection();

  constructor(bot: Bot) {
    this.bot = bot;
  }

  public async start() {
    let items : any[] = [];

    items = await this._getCosmetics();
    await this._saveCosmetics(items);

    setInterval(async () => {
      items = await this._getCosmetics();
      await this._saveCosmetics(items);
    }, 60 * 60 * 1000);
  }

  private async _getCosmetics() : Promise<any[]> {
    try {
      const start = Date.now();
      const items = (await axios.get(
        'https://fortnite-api.com/v2/cosmetics/br',
      )).data.data as any[];
      this.bot.logger.info(`Fetched ${items.length} cosmetics [${(Date.now() - start).toFixed(2)}ms]`);
      return items;
    } catch (e) {
      return [];
    }
  }

  private async _saveCosmetics(items: any[]) : Promise<void> {
    const cosmeticsModel = this.bot.cosmeticModel;

    await Promise.all(items.map(async (item) => {
      try {
        const cosmetic = await cosmeticsModel.findOne({
          id: item.id,
        }).lean().exec();

        if (!cosmetic) {
          this.bot.logger.warn(`${item.name} not found in database.`);

          await cosmeticsModel.create({
            id: item.id,
            name: item.name,
            description: item.description,
            type: await this.getCosmeticType({
              value: item.type.value,
              displayValue: item.type.displayValue,
              backendValue: item.type.backendValue,
            }),
            rarity: await this.getCosmeticRarity({
              value: item.rarity.value,
              displayValue: item.rarity.displayValue,
              backendValue: item.rarity.backendValue,
            }),
            series: item.series ? await this.getCosmeticSeries({
              value: item.series.value,
              displayValue: item.series.displayValue,
              backendValue: item.series.backendValue,
            }) : null,
            set: item.set ? await this.getCosmeticSet({
              value: item.set.value,
              text: item.set.text,
              backendValue: item.set.backendValue,
            }) : null,
            introduction: item.introduction ? await this.getCosmeticIntroducedIn({
              chapter: item.introduction.chapter,
              season: item.introduction.season,
              text: item.introduction.text,
              seasonNumber: item.introduction.backendValue,
            }) : null,
            image: await this._getCosmeticImage(item.images.icon ?? item.images.smallIcon),
            searchTags: item.searchTags ?? [],
            gameplayTags: item.gameplayTags ?? [],
            metaTags: item.metaTags ?? [],
            showcaseVideo: item.showcaseVideo ?? null,
            path: item.path,
            addedAt: item.added,
            shopHistory: item.shopHistory ? item.shopHistory : [],
          });

          const created = await cosmeticsModel.findOne({
            id: item.id,
          }).lean().exec();
          this.cosmetics.set(created!.id.toLowerCase(), {
            ...created!,
            image: undefined,
          });
        } else {
          this.cosmetics.set(cosmetic.id.toLowerCase(), {
            ...cosmetic,
            image: undefined,
          });
        }
      } catch (e) {
        this.bot.logger.error(e);
      }
    }));
  }

  private async getCosmeticType(value: KeyValuePair, retry = true) : Promise<Types.ObjectId> {
    const typesModel = this.bot.cosmeticTypeModel;

    const type = await typesModel.findOne({
      value: value.value,
    }).lean().exec();
    if (!type) {
      try {
        return (await typesModel.create(value))._id;
      } catch (e) {
        this.bot.logger.error(e);

        if (retry) {
          return this.getCosmeticType(value, false);
        }
      }
    }

    return type!._id;
  }

  private async getCosmeticRarity(value: KeyValuePair, retry = true) : Promise<Types.ObjectId> {
    const raritiesModel = this.bot.cosmeticRarityModel;

    const rarity = await raritiesModel.findOne({
      value: value.value,
    }).lean().exec();
    if (!rarity) {
      try {
        return (await raritiesModel.create(value))._id;
      } catch (e) {
        this.bot.logger.error(e);

        if (retry) {
          return this.getCosmeticRarity(value, false);
        }
      }
    }

    return rarity!._id;
  }

  private async getCosmeticSeries(value: KeyValuePair, retry = true) : Promise<Types.ObjectId> {
    const seriesModel = this.bot.cosmeticSeriesModel;

    const series = await seriesModel.findOne({
      value: value.value,
    }).lean().exec();
    if (!series) {
      try {
        return (await seriesModel.create(value))._id;
      } catch (e) {
        this.bot.logger.error(e);

        if (retry) {
          return this.getCosmeticSeries(value, false);
        }
      }
    }

    return series!._id;
  }

  private async getCosmeticSet(value: KeyValuePair, retry = true) : Promise<Types.ObjectId> {
    const setsModel = this.bot.cosmeticSetModel;

    const set = await setsModel.findOne({
      value: value.value,
    }).lean().exec();
    if (!set) {
      try {
        return (await setsModel.create(value))._id;
      } catch (e) {
        this.bot.logger.error(e);

        if (retry) {
          return this.getCosmeticSet(value, false);
        }
      }
    }

    return set!._id;
  }

  private async getCosmeticIntroducedIn(value: KeyValuePair, retry = true) : Promise<Types.ObjectId> {
    const introducedInModel = this.bot.cosmeticIntroducedInModel;

    const introducedIn = await introducedInModel.findOne({
      seasonNumber: value.seasonNumber,
    }).lean().exec();
    if (!introducedIn) {
      try {
        return (await introducedInModel.create(value))._id;
      } catch (e) {
        this.bot.logger.error(e);

        if (retry) {
          return this.getCosmeticIntroducedIn(value, false);
        }
      }
    }

    return introducedIn!._id;
  }

  private async _getCosmeticImage(img : string) : Promise<Buffer> {
    try {
      return Buffer.from((await axios.get(img, { responseType: 'arraybuffer' })).data);
    } catch (e) {
      await wait(30 * 1000);
      return this._getCosmeticImage(img);
    }
  }
}

export default CosmeticService;
