import { Schema, model } from 'mongoose';

import { requiredString } from '../../../schemaTypes';
import { ICosmeticVariant } from '../typings';

const CosmeticVariantSchema = new Schema<ICosmeticVariant>({
  channel: requiredString,
  type: requiredString,
  tag: requiredString,
  name: requiredString,
  image: requiredString,
}, {
  timestamps: true,
});

export default model<ICosmeticVariant>('CosmeticVariant', CosmeticVariantSchema);
