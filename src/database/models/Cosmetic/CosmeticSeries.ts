import { Schema, model } from 'mongoose';

import { uniqueRequiredString, requiredString } from '../../schemaTypes';
import { ICosmeticSeries } from './typings';

const CosmeticSeriesSchema = new Schema<ICosmeticSeries>(
  {
    value: uniqueRequiredString,
    image: {
      type: String,
      required: false,
    },
    colors: {
      type: [String],
      required: true,
    },
    backendValue: requiredString,
  },
  {
    timestamps: true,
  }
);

export default model<ICosmeticSeries>('CosmeticSeries', CosmeticSeriesSchema);
