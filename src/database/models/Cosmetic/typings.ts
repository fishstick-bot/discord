import { Schema } from 'mongoose';

import { ICosmeticType } from './CosmeticType/typings';

export interface ICosmetic {
    id: string;
    name: string;
    description: string;
    type: Schema.Types.ObjectId | ICosmeticType;
    rarity: Schema.Types.ObjectId;
    series?: Schema.Types.ObjectId;
    set?: Schema.Types.ObjectId;
    introduction?: {
      chapter: number;
      season: number;
      text: string;
      seasonNumber: number;
    };
    image: Buffer;
    searchTags: string[];
    gameplayTags: string[];
    metaTags: string[];
    showcaseVideo?: string;
    path: string;
    addedAt: Date;
    shopHistory: Date[];
  }
