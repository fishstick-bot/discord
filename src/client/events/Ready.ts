import { Interaction } from 'discord.js';
import { promisify } from 'util';

import type IEvent from '../../structures/Event';
import getLogger from '../../Logger';

const wait = promisify(setTimeout);
const logger = getLogger('COMMAND');

const Event: IEvent = {
  name: 'ready',
  run: async (bot, interaction: Interaction) => {
    setInterval(async () => {
      bot.user?.setActivity({
        type: 'PLAYING',
        name: `/help in ${await bot.getGuildCount()} servers`,
      });
    }, 5 * 60 * 1000);
  },
};

export default Event;
