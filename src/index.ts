/* eslint-disable no-console */
import 'dotenv/config';
import { WebhookClient, MessageEmbed } from 'discord.js';
import Cluster from 'discord-hybrid-sharding';

import Config from './Config';

const webhook = new WebhookClient({
  url: new Config().loggingWebhook,
});

const manager = new Cluster.Manager(`${__dirname}/bot.js`, {
  totalShards: 'auto',
  totalClusters: 'auto',
  shardsPerClusters: 2,
  mode: 'process',
  token: process.env.DISCORD_TOKEN!,
  restarts: {
    max: 5,
    interval: 60 * 60 * 1000,
  },
});
manager.extend(
  new Cluster.HeartbeatManager({
    interval: 5 * 1000,
    maxMissedHeartbeats: 12,
  }),
);

manager.on('clusterCreate', async (cluster) => {
  console.log(`Launched cluster ${cluster.id}`);
  await webhook.send(`Launched cluster ${cluster.id}`);
});

manager.on('debug', async (msg) => {
  console.log('[DEBUG]', msg);
  await webhook.send(`\`\`\`${msg}\`\`\``);
});

manager.spawn({
  timeout: -1,
  delay: 5 * 1000,
});

process.on('unhandledRejection', async (error: any) => {
  console.error(error);

  const embed = new MessageEmbed()
    .setTitle('Unhandled rejection')
    .setDescription(`${error}`)
    .setColor('RED')
    .setTimestamp()
    .setFooter({
      text: 'Sharding Manager',
    });

  if (error?.stack) {
    embed.addField('Stack', `\`\`\`${error.stack}\`\`\``);
  }

  await webhook.send({
    embeds: [embed],
  });
});

// process.on('SIGINT', async () => {
//   if (!isDevelopment) {
//     await webhook.send('Shutting down...');
//   }
//   manager.clusters.forEach(async (cluster) => {
//     try {
//       cluster.process?.kill();
//       cluster?.kill();
//       console.log(`Killed cluster ${cluster.id}`);
//     } catch (e) {
//       console.error(e);
//     }
//   });
// });
