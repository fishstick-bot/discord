import { Schema } from 'mongoose';

interface ISimpleValueType {
  value: string;
  displayValue: string;
  backendValue: string;
}

export interface ICosmeticType extends ISimpleValueType {}

export interface ICosmeticRarity extends ISimpleValueType {}

export interface ICosmeticSeries {
  value: string;
  image?: string;
  colors: string[];
  backendValue: string;
}

export interface ICosmeticSet {
  value: string;
  text: string;
  backendValue: string;
}

export interface ICosmeticIntroducedIn {
  chapter: string;
  season: string;
  text: string;
  seasonNumber: number;
}

export interface ICosmetic {
    id: string;
    name: string;
    description: string;
    type: Schema.Types.ObjectId | ICosmeticType;
    rarity: Schema.Types.ObjectId | ICosmeticRarity;
    series?: Schema.Types.ObjectId | ICosmeticSeries;
    set?: Schema.Types.ObjectId | ICosmeticSet;
    introduction?: ICosmeticIntroducedIn;
    image: Buffer;
    searchTags: string[];
    gameplayTags: string[];
    metaTags: string[];
    showcaseVideo?: string;
    path: string;
    addedAt: Date;
    shopHistory: Date[];
    isExclusive: boolean;
  }
