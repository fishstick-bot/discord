/* eslint-disable no-console */
import 'dotenv/config';
import { WebhookClient, EmbedBuilder, Colors } from 'discord.js';
import { ClusterManager, HeartbeatManager } from 'discord-hybrid-sharding';

import Config from './Config';

const webhook = new WebhookClient({
  url: new Config().loggingWebhook,
});

const manager = new ClusterManager(`${__dirname}/bot.js`, {
  totalShards: 'auto',
  totalClusters: 'auto',
  shardsPerClusters: 4,
  mode: 'process',
  token: process.env.DISCORD_TOKEN!,
  restarts: {
    max: 5,
    interval: 60 * 60 * 1000,
  },
});
manager.extend(
  new HeartbeatManager({
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
  delay: 7000,
});

process.on('unhandledRejection', async (error: any) => {
  console.error(error);

  const embed = new EmbedBuilder()
    .setTitle('Unhandled rejection')
    .setDescription(`${error}`)
    .setColor(Colors.Red)
    .setTimestamp()
    .setFooter({
      text: 'Sharding Manager',
    });

  if (error?.stack) {
    embed.addFields([{ name: 'Stack', value: `\`\`\`${error.stack}\`\`\`` }]);
  }

  await webhook.send({
    embeds: [embed],
  });
});
