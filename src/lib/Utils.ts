/* eslint-disable import/prefer-default-export */
import { CommandInteraction, MessageEmbed } from 'discord.js';
import type { Logger } from 'winston';

import UserNotFoundError from '../structures/UserNotFoundError';
import Emojies from '../resources/Emojis';

const handleCommandError = async (
  logger: Logger,
  interaction: CommandInteraction,
  e: any,
) => {
  logger.error(e);

  let errorEmbed: MessageEmbed;
  if (e instanceof UserNotFoundError) {
    errorEmbed = new MessageEmbed()
      .setTitle(`${Emojies.cross} USER NOT FOUND`)
      .setColor('RED')
      .setDescription(e.message)
      .setTimestamp();
  } else {
    errorEmbed = new MessageEmbed()
      .setTitle(`${Emojies.cross} NOT THE LLAMA YOU'RE LOOKING FOR`)
      .setColor('RED')
      .setDescription(
        `An error occured while running the command ${interaction.commandName}.\n${e}\n\nIf this error persists, please report it in our [support server](https://discord.gg/fishstick).`,
      )
      .addField('Stack', `\`\`\`${e.stack ?? e ?? 'UNKNOWN ERROR'}\`\`\``)
      .setTimestamp();
  }

  await interaction
    .editReply({
      content: ' ',
      embeds: [errorEmbed],
      components: [],
    })
    // eslint-disable-next-line no-console
    .catch(console.error);
};

export { handleCommandError };
