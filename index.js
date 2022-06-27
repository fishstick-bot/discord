/* eslint-disable no-console */
require('dotenv').config();
const Cluster = require('discord-hybrid-sharding');

const shardingmanager = new Cluster.Manager(`${__dirname}/dist/index.js`, {
  totalShards: 'auto',
  //   totalClusters: 'auto',
  shardsPerClusters: 2,
  mode: 'process',
  token: process.env.DISCORD_TOKEN,
  usev13: true,
});

shardingmanager.on('clusterCreate', (cluster) => {
  console.log(`Launched cluster ${cluster.id}`);
});

shardingmanager.on('debug', console.log);

shardingmanager.spawn({
  timeout: -1,
});

// handle process exit
process.on('SIGINT', async () => {
  shardingmanager.clusters.forEach(async (cluster) => {
    try {
      cluster.process?.kill();
      cluster?.kill();
      console.log(`Killed cluster ${cluster.id}`);
    } catch (e) {
      console.error(e);
    }
  });
});

// handle errors
process.on('unhandledRejection', (error) => {
  console.error(error);
});
