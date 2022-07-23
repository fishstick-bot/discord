/* eslint-disable no-console */
import 'dotenv/config';
import { MessageEmbed } from 'discord.js';

import Bot from './client/Client';

const bot = new Bot();
(async () => {
  await bot.start();
})();

process.on('unhandledRejection', async (error: any) => {
  if (
    `${error}`.includes(
      'Sorry the account credentials you are using are invalid',
    ) ||
    `${error}`.includes(
      'Sorry the authorization code you supplied was not found. It is possible that it was no longer valid',
    ) ||
    `${error}`.includes('Sorry the account you are using is not active.')
  ) {
    return;
  }

  const embed = new MessageEmbed()
    .setTitle('Unhandled rejection')
    .setDescription(`${error}`)
    .setColor('RED')
    .setTimestamp()
    .setFooter({
      text: `Cluster ${bot.cluster.id}`,
    });

  if (error?.stack) {
    embed.addField('Stack', `\`\`\`${error.stack}\`\`\``);
  }

  await bot.loggingWebhook.send({
    embeds: [embed],
  });
});
