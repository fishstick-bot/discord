import type { Message } from 'discord.js';
import type { Document, Types } from 'mongoose';

import Bot from '../client/Client';
import { IUser, IGuild } from '../database/models/typings';

type RunCommand = (
  bot: Bot,
  msg: Message,
  user: Document<unknown, any, IUser> &
    IUser & {
      _id: Types.ObjectId;
    },
  guild:
    | (Document<unknown, any, IGuild> &
        IGuild & {
          _id: Types.ObjectId;
        })
    | null,
) => Promise<void>;

interface CommandOptions {
  dmOnly?: boolean;
  guildOnly?: boolean;
  premiumOnly?: boolean;
  partnerOnly?: boolean;
  ownerOnly?: boolean;
  restrictions?: string[];
  needsEpicAccount?: boolean;
}

export interface ILegacyCommand {
  name: string;

  options: CommandOptions;

  run: RunCommand;
}
