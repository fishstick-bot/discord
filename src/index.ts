import 'dotenv/config';

import Bot from './client/Client';

const bot = new Bot();
(async () => {
  await bot.start();
})();
