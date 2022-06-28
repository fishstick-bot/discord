import { Collection } from 'discord.js';
import { Client } from 'fnbr';

import Bot from '../client/Client';

class FortniteManager {
  private bot: Bot;

  private clients: Collection<string, Client> = new Collection();

  constructor(bot: Bot) {
    this.bot = bot;
  }
}
