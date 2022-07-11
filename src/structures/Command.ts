import type { CommandInteraction } from 'discord.js';
import type {
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from '@discordjs/builders';
import type { Document, Types } from 'mongoose';

import Bot from '../client/Client';
import { IUser, IGuild } from '../database/models/typings';

type RunCommand = (
  bot: Bot,
  interaction: CommandInteraction,
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
  privateResponse?: boolean;

  premiumOnly?: boolean;
  partnerOnly?: boolean;
  ownerOnly?: boolean;
  needsEpicAccount?: boolean;
}

export interface ICommand {
  name: string;

  slashCommandBuilder:
    | SlashCommandBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;

  options: CommandOptions;

  run: RunCommand;
}
