/* eslint-disable import/prefer-default-export */
import { Colors, CommandInteraction, EmbedBuilder } from 'discord.js';
import type { Logger } from 'winston';
import type { Document, Types } from 'mongoose';

import Bot from '../client/Client';
import UserNotFoundError from '../structures/UserNotFoundError';
import Emojies from '../resources/Emojis';
import { IEpicAccount, IUser } from '../database/models/typings';

const handleCommandError = async (
  bot: Bot | undefined,
  user:
    | (Document<unknown, any, IUser> &
        IUser & {
          _id: Types.ObjectId;
        })
    | undefined,
  logger: Logger,
  interaction: CommandInteraction,
  e: any,
) => {
  try {
    logger.error(`${e}`);

    if (bot && user) {
      if (
        `${e}`.includes('Sorry the refresh token') ||
        `${e}`.includes('Malformed auth token')
      ) {
        (user.epicAccounts as IEpicAccount[]).forEach((a) => {
          bot.fortniteManager.removeAccount(a.accountId);
        });

        await interaction
          .editReply({
            content:
              'Refreshing auth session for your epic account, please retry the command.',
            embeds: [],
            components: [],
            files: [],
          })
          // eslint-disable-next-line no-console
          .catch(console.error);
        return;
      }

      if (
        `${e}`.includes(
          'Sorry the account credentials you are using are invalid',
        )
      ) {
        await interaction
          .editReply({
            content:
              'Your account credentials are invalid, please logout and login again.',
            embeds: [],
            components: [],
            files: [],
          })
          // eslint-disable-next-line no-console
          .catch(console.error);
        return;
      }
    }

    let errorEmbed: EmbedBuilder;
    if (e instanceof UserNotFoundError) {
      errorEmbed = new EmbedBuilder()
        .setTitle(`${Emojies.cross} USER NOT FOUND`)
        .setColor(Colors.Red)
        .setDescription(e.message)
        .setTimestamp();
    } else {
      errorEmbed = new EmbedBuilder()
        .setTitle(`${Emojies.cross} NOT THE LLAMA YOU'RE LOOKING FOR`)
        .setColor(Colors.Red)
        .setDescription(
          `An error occured while running the command ${interaction.commandName}.\n${e}\n\nIf this error persists, please report it in our [support server](https://discord.gg/fishstick).`,
        )
        .addFields([
          {
            name: 'Stack',
            value: `\`\`\`${e.stack ?? e ?? 'UNKNOWN ERROR'}\`\`\``,
          },
        ])
        .setTimestamp();
    }

    await interaction
      .editReply({
        content: ' ',
        embeds: [errorEmbed],
        components: [],
        files: [],
      })
      // eslint-disable-next-line no-console
      .catch(console.error);
  } catch (error) {
    logger.error(`SEVERE COMMAND ERROR - ${error}`);
  }
};

const truncateString = (str: string) =>
  `${str.substring(0, 1)}${'#'.repeat(str.length - 2)}${str.substring(
    str.length - 1,
    str.length,
  )}`;

export { handleCommandError, truncateString };
