import { Schema, model } from 'mongoose';

import { uniqueRequiredString, requiredString } from '../../schemaTypes';
import { ICosmeticType } from './typings';

const CosmeticTypeSchema = new Schema<ICosmeticType>({
  value: uniqueRequiredString,
  displayValue: requiredString,
  backendValue: requiredString,
});

export default model<ICosmeticType>('CosmeticType', CosmeticTypeSchema);
