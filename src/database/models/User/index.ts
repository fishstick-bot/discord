import { Schema, model } from 'mongoose';
import autopopulate from 'mongoose-autopopulate';

import { uniqueRequiredString } from '../../schemaTypes';
import { IUser } from './typings';

const UserSchema = new Schema<IUser>(
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
    isPartner: {
      type: Boolean,
      required: false,
      default: false,
    },

    blacklisted: {
      type: Boolean,
      required: false,
      default: false,
    },
    blacklistedAt: {
      type: Date,
      required: false,
    },
    blacklistedReason: {
      type: String,
      required: false,
    },

    epicAccounts: {
      type: [Schema.Types.ObjectId],
      ref: 'EpicAccount',
      autopopulate: true,
      default: [],
      required: false,
    },
  },
  {
    timestamps: true,
  }
);
UserSchema.plugin(autopopulate);

export default model<IUser>('User', UserSchema);
