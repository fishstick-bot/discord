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
    )
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
