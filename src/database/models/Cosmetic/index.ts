import { Schema, model } from 'mongoose';
import autopopulate from 'mongoose-autopopulate';

import {
  requiredString,
  uniqueRequiredString,
  objectId,
  requiredObjectId,
  stringArray,
} from '../../schemaTypes';
import { ICosmetic } from './typings';

const CosmeticSchema = new Schema<ICosmetic>(
  {
    id: {
      ...uniqueRequiredString,
      index: true,
    },
    name: requiredString,
    description: requiredString,
    type: {
      ...requiredObjectId,
      ref: 'CosmeticType',
      autopopulate: true,
    },
    rarity: {
      ...requiredObjectId,
      ref: 'CosmeticRarity',
      autopopulate: true,
    },
    series: {
      ...objectId,
      ref: 'CosmeticSeries',
      autopopulate: true,
    },
    set: {
      ...objectId,
      ref: 'CosmeticSet',
      autopopulate: true,
    },
    introduction: {
      ...objectId,
      ref: 'CosmeticIntroducedIn',
      autopopulate: true,
    },
    image: requiredString,
    searchTags: stringArray,
    gameplayTags: stringArray,
    metaTags: stringArray,
    showcaseVideo: {
      type: String,
      required: false,
    },
    path: requiredString,
    addedAt: {
      type: Date,
      required: true,
    },
    shopHistory: {
      type: [Date],
      required: false,
      default: [],
    },
    isExclusive: {
      type: Boolean,
      default: false,
    },
    isCrew: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);
CosmeticSchema.plugin(autopopulate);

export default model<ICosmetic>('Cosmetic', CosmeticSchema);
