/* eslint-disable no-console */
import { WebhookClient, MessageEmbed } from 'discord.js';
import Cluster from 'discord-hybrid-sharding';
import 'dotenv/config';

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
});

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
});

process.on('SIGINT', async () => {
  await webhook.send('Shutting down...');
  manager.clusters.forEach(async (cluster) => {
    try {
      cluster.process?.kill();
      cluster?.kill();
      console.log(`Killed cluster ${cluster.id}`);
    } catch (e) {
      console.error(e);
    }
  });
});

process.on('unhandledRejection', async (error: any) => {
  console.error(error);
  const embed = new MessageEmbed()
    .setTitle('Unhandled rejection')
    .setDescription(`${error}`)
    .setColor('RED')
    .setTimestamp();

  if (error?.stack) {
    embed.addField('Stack', `\`\`\`${error.stack}\`\`\``);
  }

  await webhook.send({
    embeds: [embed],
  });
});
