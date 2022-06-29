import { Schema, model } from 'mongoose';
import autopopulate from 'mongoose-autopopulate';

import {
  uniqueRequiredString,
  requiredNumber,
  requiredObjectId,
  objectId,
} from '../../schemaTypes';
import { IPremiumKey } from './typings';

const PremiumKeySchema = new Schema<IPremiumKey>(
  {
    code: {
      ...uniqueRequiredString,
      index: true,
    },
    premiumDays: requiredNumber,

    createdBy: requiredObjectId,

    redeemedBy: objectId,
    redeemedAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  },
);
PremiumKeySchema.plugin(autopopulate);

export default model<IPremiumKey>('PremiumKey', PremiumKeySchema);
