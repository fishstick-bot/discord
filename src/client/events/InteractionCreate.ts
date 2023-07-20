import {
  Interaction,
  Collection,
  EmbedBuilder,
  Colors,
  ChannelType,
  LimitedCollection,
} from 'discord.js';
import { promisify } from 'util';
import { Endpoints } from 'fnbr';

import { Document, Types } from 'mongoose';
import type IEvent from '../../structures/Event';
import getLogger from '../../Logger';
import Emojies from '../../resources/Emojis';
import { IEpicAccount, IUser } from '../../database/models/typings';
import { handleCommandError } from '../../lib/Utils';

const wait = promisify(setTimeout);
const logger = getLogger('COMMAND');

const userCache = new LimitedCollection<
  string,
  Document<unknown, any, IUser> &
    IUser & {
      _id: Types.ObjectId;
    }
>({
  maxSize: 100,
});

const Event: IEvent = {
  name: 'interactionCreate',
  run: async (bot, interaction: Interaction) => {
    if (interaction.isChatInputCommand()) {
      const cmd = bot.commands.get(interaction.commandName);
      if (!cmd) return;

      logger.info(`${interaction.user.tag} used command ${cmd.name}`);

      if (
        cmd.options.ownerOnly &&
        interaction.user.id !== bot._config.ownerDiscordID
      ) {
        await interaction.reply('You are not allowed to use this command.');
        return;
      }

      const isInDM = interaction.channel?.type === ChannelType.DM ?? false;
      await interaction
        .deferReply({
          ephemeral: cmd.options.privateResponse && !isInDM,
        })
        .catch(() => {});

      let user:
        | (Document<unknown, any, IUser> &
            IUser & {
              _id: Types.ObjectId;
            })
        | null = null;

      if (userCache.has(interaction.user.id)) {
        user = userCache.get(interaction.user.id)!;
      }

      if (!user) {
        user = await bot.userModel
          .findOne({
            id: interaction.user.id,
          })
          .exec();
        if (user) userCache.set(interaction.user.id, user);

        if (!user) {
          user = await bot.userModel.create({
            id: interaction.user.id,
          });
          userCache.set(interaction.user.id, user);
        }

        setTimeout(() => {
          userCache.delete(interaction.user.id);
        }, 30 * 1000);
      }

      if (user.blacklisted) {
        await interaction.editReply(
          `You are blacklisted from using this bot for ${
            user.blacklistedReason
              ? `reason: ${user.blacklistedReason}`
              : 'no reason'
          }`,
        );
        return;
      }

      let guild =
        interaction.guildId && cmd.options.guildOnly
          ? await bot.guildModel
              .findOne({
                id: interaction.guildId,
              })
              .exec()
          : null;

      if (!guild && interaction.guildId && cmd.options.guildOnly) {
        guild = await bot.guildModel.create({
          id: interaction.guildId,
        });
      }

      if (cmd.options.guildOnly && !guild) {
        await interaction.editReply(
          'You can only use this command in a server.',
        );
        return;
      }

      if (cmd.options.partnerOnly && !user.isPartner) {
        await interaction.editReply(
          'You must be Fishstick Partner to use this command, for more information make a ticket in [our support server](https://discord.gg/fishstick)',
        );
        return;
      }

      const isPremium =
        user.premiumUntil.getTime() > Date.now() || user.isPartner;
      if (cmd.options.premiumOnly && !isPremium) {
        const noPremiumEmbed = new EmbedBuilder()
          .setTitle(`${Emojies.cross} You are not a premium user`)
          .setColor(Colors.Red)
          .setDescription(
            `You must be a Fishstick Premium User to use this command.
To become a Fishstick Premium User, you can purchase a subscription by messaging Vanxh#6969 or by [joining our support server](https://discord.gg/fishstick).

**Premium Plans (per user)**
• $2 / month
• $10 / year

**Payment Methods**
• Paypal - https://paypal.me/vanxh

**Want to try premium? [Vote for the bot](https://fishstickbot.com/vote) and get premium access for 6 hours.**
**Premium helps us to keep the bot running and improve the bot's features.**`,
          )
          .setTimestamp();

        await interaction.editReply({
          embeds: [noPremiumEmbed],
        });

        return;
      }

      if (cmd.options.needsEpicAccount && user.epicAccounts.length === 0) {
        await interaction.editReply(
          'You must have an Epic account logged in to use this command. Use `/login` to login to an Epic account.',
        );

        return;
      }

      if (cmd.options.needsEpicAccount && user.selectedEpicAccount === '') {
        user.selectedEpicAccount = (
          user.epicAccounts[0] as IEpicAccount
        ).accountId;
      }

      if (!bot.cooldowns.has(cmd.name)) {
        bot.cooldowns.set(cmd.name, new Collection<string, number>());
      }

      const cooldown = bot.cooldowns.get(cmd.name)!;

      if (cooldown.has(interaction.user.id)) {
        const timeLeft =
          (cooldown.get(interaction.user.id)! - Date.now()) / 1000;
        await interaction.editReply(
          `You must wait ${timeLeft.toFixed(
            1,
          )} seconds before using this command again.`,
        );

        setTimeout(async () => {
          await interaction.deleteReply();
        }, timeLeft * 1000);
        return;
      }

      cooldown.set(
        interaction.user.id,
        Date.now() + (isPremium ? bot.cooldown / 2 : bot.cooldown) * 1000,
      );

      setTimeout(() => {
        cooldown.delete(interaction.user.id);
      }, (isPremium ? bot.cooldown / 2 : bot.cooldown) * 1000);

      try {
        await cmd.run(bot, interaction, user, guild);
      } catch (e: any) {
        await handleCommandError(bot, user, logger, interaction, e);
      }
    }

    if (interaction.isButton() || interaction.isSelectMenu()) {
      await wait(500);
      await interaction.deferUpdate().catch(() => {});
    }
  },
};

export default Event;
