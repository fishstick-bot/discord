/* eslint-disable no-console */
import Cluster from 'discord-hybrid-sharding';

require('dotenv').config();

console.log(__dirname);
const manager = new Cluster.Manager(`${__dirname}/bot.js`, {
  totalShards: 'auto',
  totalClusters: 'auto',
  shardsPerClusters: 2,
  mode: 'process',
  token: process.env.DISCORD_TOKEN!,
});

manager.on('clusterCreate', (cluster) => {
  console.log(`Launched cluster ${cluster.id}`);
});

manager.on('debug', console.log);

manager.spawn({
  timeout: -1,
});

process.on('SIGINT', async () => {
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

process.on('unhandledRejection', (error) => {
  console.error(error);
});
