import { Schema, model } from 'mongoose';

import { requiredString, uniqueRequiredNumber } from '../../schemaTypes';
import { ICosmeticIntroducedIn } from './typings';

const CosmeticIntroducedInSchema = new Schema<ICosmeticIntroducedIn>({
  chapter: requiredString,
  season: requiredString,
  text: requiredString,
  seasonNumber: uniqueRequiredNumber,
});

export default model<ICosmeticIntroducedIn>(
  'CosmeticIntroducedIn',
  CosmeticIntroducedInSchema,
);
