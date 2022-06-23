import { Schema, model } from 'mongoose';

import { requiredString, uniqueRequiredNumber, requiredNumber } from '../../../schemaTypes';
import { ICosmeticIntroducedIn } from '../typings';

const CosmeticIntroducedInSchema = new Schema<ICosmeticIntroducedIn>({
  chapter: requiredNumber,
  season: requiredNumber,
  text: requiredString,
  seasonNumber: uniqueRequiredNumber,
}, {
  timestamps: true,
});

export default model<ICosmeticIntroducedIn>('CosmeticIntroducedIn', CosmeticIntroducedInSchema);
