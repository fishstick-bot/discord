import axios from 'axios';
import { Collection } from 'discord.js';
import type { Types } from 'mongoose';
import sharp from 'sharp';
import { promisify } from 'util';
import { promises } from 'fs';

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

    items = await this.getCosmetics();
    await this.saveCosmetics(items);

    console.log({
      ...this.cosmetics.first()!,
      image: 'VANXH',
    });
    console.log(this.cosmetics.size);
    console.log(process.memoryUsage().heapUsed / 1024 / 1024);
    await promises.writeFile('h.jpeg', Buffer.from(this.cosmetics.first()!.image.buffer));

    setInterval(async () => {
      items = await this.getCosmetics();
      await this.saveCosmetics(items);
    }, 60 * 60 * 1000);
  }

  public async getCosmetics() : Promise<any[]> {
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

  public async saveCosmetics(items: any[]) : Promise<void> {
    await Promise.all(items.map(async (item) => {
      await this.saveCosmetic(item);
    }));
  }

  public async saveCosmetic(item: any) : Promise<void> {
    const cosmeticsModel = this.bot.cosmeticModel;

    try {
      const cosmetic = await cosmeticsModel.findOne({
        id: item.id,
      }).populate('type').populate('rarity').populate('series')
        .populate('set')
        .populate('introduction')
        .lean()
        .exec();

      if (!cosmetic) {
        this.bot.logger.warn(`${item.name} not found in database.`);

        await cosmeticsModel.create({
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
          series: item.series ? await this._getCosmeticSeries({
            value: item.series.value,
            displayValue: item.series.displayValue,
            backendValue: item.series.backendValue,
          }) : null,
          set: item.set ? await this._getCosmeticSet({
            value: item.set.value ?? item.set.backendValue,
            text: item.set.text ?? item.set.backendValue,
            backendValue: item.set.backendValue,
          }) : null,
          introduction: item.introduction ? await this._getCosmeticIntroducedIn({
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
        }).populate('type').populate('rarity').populate('series')
          .populate('set')
          .populate('introduction')
          .lean()
          .exec();
        this.cosmetics.set(created!.id.toLowerCase(), created!);
      } else {
        this.cosmetics.set(cosmetic.id.toLowerCase(), cosmetic);
      }
    } catch (e) {
      this.bot.logger.error(e);
    }
  }

  private async _getCosmeticType(value: KeyValuePair, retry = true) : Promise<Types.ObjectId> {
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
          return this._getCosmeticType(value, false);
        }
      }
    }

    return type!._id;
  }

  private async _getCosmeticRarity(value: KeyValuePair, retry = true) : Promise<Types.ObjectId> {
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
          return this._getCosmeticRarity(value, false);
        }
      }
    }

    return rarity!._id;
  }

  private async _getCosmeticSeries(value: KeyValuePair, retry = true) : Promise<Types.ObjectId> {
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
          return this._getCosmeticSeries(value, false);
        }
      }
    }

    return series!._id;
  }

  private async _getCosmeticSet(value: KeyValuePair, retry = true) : Promise<Types.ObjectId> {
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
          return this._getCosmeticSet(value, false);
        }
      }
    }

    return set!._id;
  }

  private async _getCosmeticIntroducedIn(value: KeyValuePair, retry = true) : Promise<Types.ObjectId> {
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
          return this._getCosmeticIntroducedIn(value, false);
        }
      }
    }

    return introducedIn!._id;
  }

  private async _getCosmeticImage(img : string) : Promise<Buffer> {
    try {
      return sharp(Buffer.from((await axios.get(img, { responseType: 'arraybuffer' })).data)).resize(256, 256).toFormat('jpeg').toBuffer();
    } catch (e) {
      await wait(30 * 1000);
      return this._getCosmeticImage(img);
    }
  }
}

export default CosmeticService;
