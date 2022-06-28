import { Schema, model } from 'mongoose';
import autopopulate from 'mongoose-autopopulate';

import { uniqueRequiredString } from '../../schemaTypes';
import { ISurvivorSquadPreset } from './typings';

const SurvivorSquadPresetSchema = new Schema<ISurvivorSquadPreset>(
  {
    name: uniqueRequiredString,
    characterIds: {
      type: [String],
      required: true,
    },
    squadIds: {
      type: [String],
      required: true,
    },
    slotIndices: {
      type: [Number],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);
SurvivorSquadPresetSchema.plugin(autopopulate);

export default model<ISurvivorSquadPreset>(
  'SurvivorSquadPreset',
  SurvivorSquadPresetSchema
);
