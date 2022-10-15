/* eslint-disable no-console */
import 'dotenv/config';
import { promises as fs, existsSync } from 'fs';
import { Colors, EmbedBuilder } from 'discord.js';

import Bot from './client/Client';

const bot = new Bot();
(async () => {
  if (!existsSync('./Shop')) {
    await fs.mkdir('./Shop');
  }
  if (!existsSync('./Shop/BR')) {
    await fs.mkdir('./Shop/BR');
  }

  if (!existsSync('./STWInventory')) {
    await fs.mkdir('./STWInventory');
  }

  if (!existsSync('./STWResources')) {
    await fs.mkdir('./STWResources');
  }

  if (!existsSync('./Cosmetics')) {
    await fs.mkdir('./Cosmetics');
  }

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

  const embed = new EmbedBuilder()
    .setTitle('Unhandled rejection')
    .setDescription(`${error}`)
    .setColor(Colors.Red)
    .setTimestamp()
    .setFooter({
      text: `Cluster ${bot.cluster.id}`,
    });

  if (error?.stack) {
    embed.addFields([{ name: 'Stack', value: `\`\`\`${error.stack}\`\`\`` }]);
  }

  await bot.loggingWebhook.send({
    embeds: [embed],
  });
});
