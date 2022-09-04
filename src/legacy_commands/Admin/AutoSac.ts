import { MessageEmbed } from 'discord.js';

import type { ILegacyCommand } from '../../structures/LegacyCommand';
import Emojis from '../../resources/Emojis';

const Command: ILegacyCommand = {
  name: 'autosac',

  options: {
    ownerOnly: true,
  },

  run: async (bot, msg, user) => {
    const subcommand = msg.content.split(' ')[1].toLowerCase();
    const id = msg.content.split(' ')[2];

    if (!['add', 'remove'].includes(subcommand)) return;

    const targetUser = await bot.userModel
      .findOne({
        id,
      })
      .exec();

    if (!targetUser) {
      await msg.reply(`${Emojis.cross} ${id} not found in database.`);
      return;
    }

    if (subcommand === 'add' && !targetUser.noAutoSac) {
      await msg.reply(`${Emojis.cross} ${id} is already autosac.`);
      return;
    }

    if (subcommand === 'remove' && targetUser.noAutoSac) {
      await msg.reply(`${Emojis.cross} ${id} is not autosac.`);
      return;
    }

    targetUser.noAutoSac = subcommand === 'remove';
    await targetUser.save();

    const embed = new MessageEmbed()
      .setAuthor({
        name: `${id} Auto SAC Status`,
      })
      .setDescription(
        `${subcommand === 'add' ? 'Added' : 'Removed'} **${id}** ${
          subcommand === 'add' ? 'to' : 'from'
        } the autosac.`,
      )
      .setColor(bot._config.color)
      .setTimestamp();

    await msg.reply({
      embeds: [embed],
    });
  },
};

export default Command;
