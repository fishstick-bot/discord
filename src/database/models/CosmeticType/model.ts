import { model } from 'mongoose';

import { ICosmeticType } from './typings';
import CosmeticTypeSchema from './schema';

export default model<ICosmeticType>('CosmeticType', CosmeticTypeSchema);
