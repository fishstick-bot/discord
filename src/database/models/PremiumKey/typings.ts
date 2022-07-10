import { Schema } from 'mongoose';

export interface IPremiumKey {
  code: string;
  premiumDays: number;

  createdBy: Schema.Types.ObjectId;

  redeemedBy?: Schema.Types.ObjectId;
  redeemedAt?: Date;
}
