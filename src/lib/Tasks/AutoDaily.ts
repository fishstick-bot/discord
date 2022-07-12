import { TextChannel, MessageEmbed } from 'discord.js';
import { userMention } from '@discordjs/builders';
import cron from 'node-cron';
import { Endpoints } from 'fnbr';

import Task from '../../structures/Task';
import Bot from '../../client/Client';
import getLogger from '../../Logger';
import type { IEpicAccount } from '../../database/models/typings';
import StwDailyRewards from '../../resources/DailyRewards.json';
import Emojis from '../../resources/Emojis';

class AutoDaily implements Task {
  private bot: Bot;

  private logger = getLogger('AUTO DAILY');

  constructor(bot: Bot) {
    this.bot = bot;
  }

  public async start() {
    this.logger.info('Registering auto daily task');

    cron.schedule(
      '0 0 * * *',
      async () => {
        await this.runTask();
      },
      {
        scheduled: true,
        timezone: 'Etc/UTC',
      },
    );
  }

  private async runTask() {
    const start = Date.now();
    this.logger.info('Running auto daily task');

    const logChannel = (await this.bot.channels.fetch(
      this.bot._config.dailyRewardsChannel,
    )) as TextChannel;

    // eslint-disable-next-line no-restricted-syntax
    for await (const user of this.bot.userModel.find({})) {
      const epicAccounts = (user.epicAccounts as IEpicAccount[]).filter(
        (a) => a.autoDaily,
      );

      if (epicAccounts.length === 0) {
        // eslint-disable-next-line no-continue
        continue;
      }

      const embed = new MessageEmbed()
        .setColor(this.bot._config.color)
        .setAuthor({
          name: `Auto Daily Login Rewards | Save the World`,
        })
        .setTimestamp()
        .setDescription(
          (
            await Promise.all(epicAccounts.map((a) => this.claimDailyReward(a)))
          ).join('\n\n'),
        );

      await logChannel.send({
        content: userMention(user.id),
        embeds: [embed],
      });
    }

    this.logger.info(
      `Auto daily task finished [${(Date.now() - start).toFixed(2)}ms[]`,
    );
  }

  private async claimDailyReward(epicAccount: IEpicAccount) {
    let result = '';

    try {
      const client = await this.bot.fortniteManager.clientFromDeviceAuth(
        epicAccount.accountId,
        epicAccount.deviceId,
        epicAccount.secret,
      );

      const res = await client.http.sendEpicgamesRequest(
        true,
        'POST',
        `${Endpoints.MCP}/${epicAccount.accountId}/client/ClaimLoginReward?profileId=campaign`,
        'fortnite',
        {
          'Content-Type': 'application/json',
        },
        {},
      );

      if (res.error) {
        throw new Error(res.error.message ?? res.error.code);
      }

      const { daysLoggedIn, items } = res.response.notifications[0];

      const multiplier: number = Math.ceil(daysLoggedIn / 336);
      let baseDay: number = daysLoggedIn;
      if (daysLoggedIn > 336) baseDay = daysLoggedIn - 336 * (multiplier - 1);

      const rewardsByDay: {
        [key: string]: any;
      } = {};
      // eslint-disable-next-line no-restricted-syntax
      for (const day in StwDailyRewards) {
        if (
          parseInt(day, 10) + 1 <= baseDay + 6 &&
          parseInt(day, 10) + 1 >= baseDay
        ) {
          rewardsByDay[336 * (multiplier - 1) + parseInt(day, 10) + 1] =
            StwDailyRewards[day];
        }
      }

      const alreadyClaimed = items.length === 0;

      result = `${Emojis.tick} **${
        epicAccount.displayName
      } (${daysLoggedIn} Days)**
${
  alreadyClaimed
    ? 'You have already claimed todays reward.'
    : 'Successfully claimed todays reward.'
}
Today - **${rewardsByDay[daysLoggedIn]?.amount ?? 0}x ${
        rewardsByDay[daysLoggedIn]?.name ?? 'Unknown Item'
      }**
Tomorrow - **${rewardsByDay[daysLoggedIn + 1]?.amount ?? 0}x ${
        rewardsByDay[daysLoggedIn + 1]?.name ?? 'Unknown Item'
      }**`;
    } catch (e: any) {
      // disable auto daily if user don't has game access
      if (`${e}`.includes('Daily rewards require game access')) {
        try {
          await this.bot.epicAccountModel.findOneAndUpdate(
            {
              accountId: epicAccount.accountId,
            },
            {
              $set: {
                autoDaily: false,
              },
            },
          );
        } catch (err) {
          // ignore
        }
      }

      result = `${Emojis.cross} **${epicAccount.displayName}**
${e}`;
    }

    return result;
  }
}

export default AutoDaily;
