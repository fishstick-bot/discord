import { Schema, model } from 'mongoose';

import { uniqueRequiredString, requiredString } from '../../schemaTypes';
import { ICosmeticSet } from './typings';

const CosmeticSetSchema = new Schema<ICosmeticSet>({
  value: uniqueRequiredString,
  text: requiredString,
  backendValue: requiredString,
});

export default model<ICosmeticSet>('CosmeticSet', CosmeticSetSchema);
