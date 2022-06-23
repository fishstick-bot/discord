import { Schema } from 'mongoose';

import { requiredString } from '../../schemaTypes';
import { ICosmeticType } from './typings';

const CosmeticTypeSchema = new Schema<ICosmeticType>({
  value: requiredString,
  displayValue: requiredString,
  backendValue: requiredString,
}, {
  timestamps: true,
});

export default CosmeticTypeSchema;
