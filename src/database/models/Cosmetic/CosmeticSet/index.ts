import { Schema, model } from 'mongoose';

import { uniqueRequiredString, requiredString } from '../../../schemaTypes';
import { ICosmeticSet } from '../typings';

const CosmeticSetSchema = new Schema<ICosmeticSet>({
  value: uniqueRequiredString,
  displayValue: requiredString,
  backendValue: requiredString,
}, {
  timestamps: true,
});

export default model<ICosmeticSet>('CosmeticSet', CosmeticSetSchema);
