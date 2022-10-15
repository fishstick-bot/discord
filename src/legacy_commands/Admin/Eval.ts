import { EmbedBuilder } from 'discord.js';
import { inspect } from 'util';

import type { ILegacyCommand } from '../../structures/LegacyCommand';

// This function cleans up and prepares the
// result of our eval command input for sending
// to the channel
const clean = async (text: any) => {
  let result: any = text;

  // If our input is a promise, await it before continuing
  if (text && text.constructor.name === 'Promise') result = await text;

  // If the response isn't a string, `util.inspect()`
  // is used to 'stringify' the code in a safe way that
  // won't error out on objects with circular references
  // (like Collections, for example)
  if (typeof text !== 'string') result = inspect(text, { depth: 1 });

  // Send off the cleaned up result
  if (typeof result === 'string') {
    // Replace symbols with character code alternatives
    return result
      .replace(/`/g, `\`${String.fromCharCode(8203)}`)
      .replace(/@/g, `@${String.fromCharCode(8203)}`);
  }
  return result;
};

const Command: ILegacyCommand = {
  name: 'eval',

  options: {
    ownerOnly: true,
  },

  run: async (bot, msg, user, guild) => {
    const args = msg.content.split(' ').slice(1);

    // Evaluate (execute) our input
    // eslint-disable-next-line no-eval
    const evaled = eval(args.join(' '));

    // Clean evaled result
    const cleaned = await clean(evaled);

    const embed = new EmbedBuilder()
      .setAuthor({
        name: msg.author.tag,
        iconURL: msg.author.displayAvatarURL(),
      })
      .setTitle('Eval')
      .setColor(bot._config.color)
      .setTimestamp()
      .addFields([
        { name: 'Input', value: `\`\`\`ts\n${args.join(' ')}\n\`\`\`` },
      ])
      .addFields([{ name: 'Output', value: `\`\`\`ts\n${cleaned}\n\`\`\`` }]);

    await msg.reply({
      embeds: [embed],
    });
  },
};

export default Command;
