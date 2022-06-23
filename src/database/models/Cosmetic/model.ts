import { model } from 'mongoose';

import { ICosmetic } from './typings';
import CosmeticSchema from './schema';

export default model<ICosmetic>('Cosmetic', CosmeticSchema);
