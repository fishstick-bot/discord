import { Message, MessageEmbed } from 'discord.js';

import type IEvent from '../../structures/Event';
import type { IEpicAccount } from '../../database/models/typings';
import getLogger from '../../Logger';
import Emojies from '../../resources/Emojis';

const logger = getLogger('LEGACY COMMAND');

const isDevelopment = process.env.NODE_ENV === 'development';

const Event: IEvent = {
  name: 'messageCreate',
  run: async (bot, msg: Message) => {
    const content = msg.content.trim();
    const cmdName = content.split(' ')[0].toLowerCase();

    const cmd = bot.legacyCommands.get(cmdName);
    if (!cmd) return;

    if (
      cmd.options.restrictions &&
      !cmd.options.restrictions.includes(msg.author.id)
    ) {
      return;
    }

    logger.info(`${msg.author.tag} used command ${cmd.name}`);

    if (cmd.options.ownerOnly && msg.author.id !== bot._config.ownerDiscordID) {
      await msg.reply('You are not allowed to use this command.');
      return;
    }

    let user = await bot.userModel
      .findOne({
        id: msg.author.id,
      })
      .exec();

    if (!user) {
      user = await bot.userModel.create({
        id: msg.author.id,
      });
    }

    if (user.blacklisted) {
      await msg.reply(
        `You are blacklisted from using this bot for ${
          user.blacklistedReason
            ? `reason: ${user.blacklistedReason}`
            : 'no reason'
        }`,
      );
      return;
    }

    let guild = msg.guildId
      ? await bot.guildModel
          .findOne({
            id: msg.guildId,
          })
          .exec()
      : null;

    if (!guild && msg.guildId) {
      guild = await bot.guildModel.create({
        id: msg.guildId,
      });
    }

    if (cmd.options.guildOnly && !guild) {
      await msg.reply('This command is only available in guilds.');
      return;
    }

    if (cmd.options.dmOnly && guild) {
      await msg.reply('This command is only available in DMs.');
      return;
    }

    if (cmd.options.partnerOnly && !user.isPartner) {
      await msg.reply(
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

      await msg.reply({
        embeds: [noPremiumEmbed],
      });
    }

    if (cmd.options.needsEpicAccount && user.epicAccounts.length === 0) {
      await msg.reply(
        'You must have an Epic account logged in to use this command. Use `/login` to login to an Epic account.',
      );

      return;
    }

    if (cmd.options.needsEpicAccount && user.selectedEpicAccount === '') {
      user.selectedEpicAccount = (
        user.epicAccounts[0] as IEpicAccount
      ).accountId;
    }

    try {
      await cmd.run(bot, msg, user, guild);
    } catch (e: any) {
      await msg.reply(`Error: ${e}

**Stack**
\`\`\`
${e.stack}
\`\`\``);
    }
  },
};

export default Event;
