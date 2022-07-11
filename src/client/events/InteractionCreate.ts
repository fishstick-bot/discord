import { Interaction, Collection, MessageEmbed } from 'discord.js';
import { promisify } from 'util';

import type IEvent from '../../structures/Event';
import getLogger from '../../Logger';
import Emojies from '../../resources/Emojis';
import { IEpicAccount } from '../../database/models/typings';
import UserNotFoundError from '../../structures/UserNotFoundError';
import { handleCommandError } from '../../lib/Utils';

const wait = promisify(setTimeout);
const logger = getLogger('COMMAND');

const Event: IEvent = {
  name: 'interactionCreate',
  run: async (bot, interaction: Interaction) => {
    if (interaction.isCommand()) {
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

      const isInDM = interaction.channel?.type === 'DM' ?? false;
      await interaction
        .deferReply({
          ephemeral: cmd.options.privateResponse && !isInDM,
        })
        .catch(() => {});

      let user = await bot.userModel
        .findOne({
          id: interaction.user.id,
        })
        .exec();

      if (!user) {
        user = await bot.userModel.create({
          id: interaction.user.id,
        });
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

      if (cmd.options.partnerOnly && !user.isPartner) {
        await interaction.editReply(
          'You must be Fishstick Partner to use this command, for more information make a ticket in [our support server](https://discord.gg/fishstick)',
        );
        return;
      }

      const isPremium =
        user.premiumUntil.getTime() > Date.now() || user.isPartner;
      if (cmd.options.premiumOnly && !isPremium) {
        const noPremiumEmbed = new MessageEmbed()
          .setTitle(`${Emojies.cross} You are not a premium user`)
          .setColor('RED')
          .setDescription(
            `You must be a Fishstick Premium User to use this command.
To become a Fishstick Premium User, you can purchase a subscription by messaging Vanxh#6969 or by [joining our support server](https://discord.gg/fishstick).

**Premium Plans (per user)**
• $2 / month
• $10 / year

**Payment Methods**
• Paypal - https://paypal.me/vanxh
• Bitcoin - 16BwrsgmYXrzuun6LkuoRhuepuffiaK7A2
• Litecoin - LSZJJxkfhMhqq3ygVmJz4ox4nVrSuFdQqJ
• Solana - J37KizZ7tJA9NkqwQC16EQUm99BE7jMv9ayx2YnjwHRP

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
        await cmd.run(bot, interaction, user);
      } catch (e: any) {
        await handleCommandError(bot, user, logger, interaction, e);
      }

      const random = Math.floor(Math.random() * 100) + 1;
      if (random < 5) {
        await interaction.channel
          ?.send(
            `**You can support the bot by donating on any of the following payment methods:**
          
**Payment Methods**
• Paypal - https://paypal.me/vanxh
• Bitcoin - 16BwrsgmYXrzuun6LkuoRhuepuffiaK7A2
• Litecoin - LSZJJxkfhMhqq3ygVmJz4ox4nVrSuFdQqJ
• Solana - J37KizZ7tJA9NkqwQC16EQUm99BE7jMv9ayx2YnjwHRP`,
          )
          .catch(() => {});
      }
    }

    if (interaction.isButton() || interaction.isSelectMenu()) {
      await wait(500);
      await interaction.deferUpdate().catch(() => {});
    }
  },
};

export default Event;
