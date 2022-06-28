import { Schema, model } from 'mongoose';

import { uniqueRequiredString, requiredString } from '../../schemaTypes';
import { ICosmeticRarity } from './typings';

const CosmeticRaritySchema = new Schema<ICosmeticRarity>(
  {
    value: uniqueRequiredString,
    displayValue: requiredString,
    backendValue: requiredString,
  },
  {
    timestamps: true,
  }
);

export default model<ICosmeticRarity>('CosmeticRarity', CosmeticRaritySchema);
