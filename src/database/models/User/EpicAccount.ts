import { Schema, model } from 'mongoose';
import autopopulate from 'mongoose-autopopulate';

import { uniqueRequiredString, requiredString } from '../../schemaTypes';
import { IEpicAccount } from './typings';

const defaultBoolean = {
  type: Boolean,
  default: false,
  required: false,
};

const defaultNumber = {
  type: Number,
  default: 0,
  required: false,
};

const EpicAccountSchema = new Schema<IEpicAccount>(
  {
    accountId: uniqueRequiredString,
    displayName: requiredString,
    avatarUrl: requiredString,

    autoDaily: defaultBoolean,
    autoFreeLlamas: defaultBoolean,
    autoResearch: {
      type: String,
      enum: ['fortitude', 'offense', 'resistance', 'tech', 'auto', 'none'],
      default: 'none',
      required: false,
    },

    cachedFortitudeLevel: defaultNumber,
    cachedOffenseLevel: defaultNumber,
    cachedResistanceLevel: defaultNumber,
    cachedTechLevel: defaultNumber,

    survivorSquadPresets: {
      type: [Schema.Types.ObjectId],
      ref: 'SurvivorSquadPreset',
      autopopulate: true,
      default: [],
      required: false,
    },

    // launcherToken: requiredString,
    // launcherRefreshToken: requiredString,
    // lastLauncherTokenRefresh: {
    //   type: Date,
    //   required: true,
    // },

    deviceId: requiredString,
    secret: requiredString,
  },
  {
    timestamps: true,
  },
);
EpicAccountSchema.plugin(autopopulate);

export default model<IEpicAccount>('EpicAccount', EpicAccountSchema);
