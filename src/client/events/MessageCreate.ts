import { REST } from '@discordjs/rest';
import type { Message } from 'discord.js';
import { Routes } from 'discord-api-types/v10';

import type IEvent from '../../structures/Event';

const isDevelopment = process.env.NODE_ENV === 'development';

const Event: IEvent = {
  name: 'messageCreate',
  run: async (bot, msg: Message) => {
    const content = msg.content.trim();

    if (content === 'reloadcommands') {
      if (msg.author.id !== bot._config.ownerDiscordID) return;

      const start = Date.now();
      bot.logger.info('Started refreshing application (/) commands.');

      const commands = bot.commands.map((command) =>
        command.slashCommandBuilder.toJSON()
      );

      const rest = new REST({ version: '10' }).setToken(
        bot._config.discordToken
      );

      await rest.put(
        isDevelopment
          ? Routes.applicationGuildCommands(
              bot.user!.id,
              bot._config.developmentGuild
            )
          : Routes.applicationCommands(bot.user!.id),
        {
          body: commands,
        }
      );

      if (isDevelopment) {
        await rest.put(Routes.applicationCommands(bot.user!.id), {
          body: [],
        });
      }

      await msg.reply(
        `[${isDevelopment ? 'DEV' : 'PROD'}] Reloaded ${
          commands.length
        } command(s)${
          isDevelopment ? ` in GUILD ${bot._config.developmentGuild}` : ''
        } in ${(Date.now() - start).toFixed(2)}ms.`
      );

      bot.logger.info(
        `Finished refreshing application (/) commands. [${(
          Date.now() - start
        ).toFixed(2)}ms]`
      );
    }
  },
};

export default Event;
