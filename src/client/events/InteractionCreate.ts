import type { Interaction, CommandInteraction } from 'discord.js';
import { promisify } from 'util';

import type IEvent from '../../structures/Event';
import getLogger from '../../Logger';

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

      await interaction
        .deferReply({ ephemeral: cmd.options.privateResponse })
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
          }`
        );
        return;
      }

      if (cmd.options.partnerOnly && !user.isPartner) {
        await interaction.editReply(
          'You must be Fishstick Partner to use this command, for more information make a ticket in [our support server](https://discord.gg/fishstick)'
        );
        return;
      }

      // TODO: handle premium check

      // TODO: handle cooldown check

      try {
        await cmd.run(bot, interaction, user);
      } catch (e) {
        // TODO: Handle error
      }
    }

    if (interaction.isButton() || interaction.isSelectMenu()) {
      await wait(500);
      await interaction.deferUpdate().catch(() => {});
    }
  },
};

export default Event;
