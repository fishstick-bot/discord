import { Message } from 'discord.js';

import IEvent from '../../structures/Event';

const Event: IEvent = {
  name: 'messageCreate',
  run: async (bot, msg: Message) => {},
};

export default Event;
