import type { CommandInteraction } from 'discord.js';
import type {
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from '@discordjs/builders';
import type { Document, Types } from 'mongoose';
import { IUser } from '../database/models/typings';

import Bot from '../client/Client';

type RunCommand = (
  bot: Bot,
  interaction: CommandInteraction,
  user: Document<unknown, any, IUser> &
    IUser & {
      _id: Types.ObjectId;
    },
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
