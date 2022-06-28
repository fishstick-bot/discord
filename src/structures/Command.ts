import type { CommandInteraction } from 'discord.js';
import type { SlashCommandBuilder } from '@discordjs/builders';
import type { Document, Types } from 'mongoose';
import { IUser } from '../database/models/typings';

import Bot from '../client/Client';

type RunCommand = (
  bot: Bot,
  interaction: CommandInteraction,
  user: Document<unknown, any, IUser> &
    IUser & {
      _id: Types.ObjectId;
    }
) => Promise<void>;

interface CommandOptions {
  privateResponse?: boolean;

  premiumOnly?: boolean;
  partnerOnly?: boolean;
  ownerOnly?: boolean;
}

export interface ICommand {
  name: string;
  category: string;

  slashCommandBuilder: SlashCommandBuilder;

  options: CommandOptions;

  run: RunCommand;
}
