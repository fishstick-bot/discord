import type { Interaction, CommandInteraction } from 'discord.js';
import { promisify } from 'util';

import type IEvent from '../../structures/Event';

const wait = promisify(setTimeout);

const Event: IEvent = {
  name: 'interactionCreate',
  run: async (bot, interaction: Interaction) => {
    if (interaction.isCommand()) {
      const cmd = bot.commands.get(interaction.commandName);
      if (!cmd) return;

      bot.logger.info(`${interaction.user.tag} used command ${cmd.name}`);

      await interaction
        .deferReply({ ephemeral: cmd.options.privateResponse })
        .catch(() => {});

      try {
        await cmd.run(bot, interaction);
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
