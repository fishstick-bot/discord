import { Schema, model } from 'mongoose';

import { uniqueRequiredString } from '../../schemaTypes';
import { IGuild } from './typings';

const defaultString = {
  type: String,
  default: '',
  required: false,
};

const GuildSchema = new Schema<IGuild>(
  {
    id: {
      ...uniqueRequiredString,
      index: true,
    },

    premiumUntil: {
      type: Date,
      required: false,
      default: new Date(2000, 1, 1),
    },

    itemShopChannelId: defaultString,
    vbucksAlertsChannelId: defaultString,
    legendarySurvivorAlertsChannelId: defaultString,
  },
  {
    timestamps: true,
  },
);

export default model<IGuild>('Guild', GuildSchema);
