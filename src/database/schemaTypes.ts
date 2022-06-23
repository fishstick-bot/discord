import { Schema } from 'mongoose';

export const requiredString = { type: String, required: true };
export const uniqueRequiredString = {
  ...requiredString,
  unique: true,
  index: true,
};
export const requiredNumber = { type: Number, required: true };
export const uniqueRequiredNumber = {
  ...requiredNumber,
  unique: true,
  index: true,
};
export const stringArray = { type: [String], required: false, default: [] };
export const objectId = {
  type: Schema.Types.ObjectId,
};
export const requiredObjectId = {
  ...objectId,
  required: true,
};
