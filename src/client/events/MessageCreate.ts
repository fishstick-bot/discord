import { REST } from '@discordjs/rest';
import { Message, MessageAttachment } from 'discord.js';
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
        command.slashCommandBuilder.toJSON(),
      );

      const rest = new REST({ version: '10' }).setToken(
        bot._config.discordToken,
      );

      await rest.put(
        isDevelopment
          ? Routes.applicationGuildCommands(
              bot.user!.id,
              bot._config.developmentGuild,
            )
          : Routes.applicationCommands(bot.user!.id),
        {
          body: commands,
        },
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
        } in ${(Date.now() - start).toFixed(2)}ms.`,
      );

      bot.logger.info(
        `Finished refreshing application (/) commands. [${(
          Date.now() - start
        ).toFixed(2)}ms]`,
      );
    }

    if (content === 'generate-docs') {
      const sortedCmds = bot.commands.sort((a, b) => {
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
      });

      const cmds = [];

      let biggestNameLength = 0;
      let biggestDescriptionLength = 0;
      // eslint-disable-next-line no-restricted-syntax
      for (const cmd of sortedCmds.values()) {
        const slash: any = cmd.slashCommandBuilder.toJSON();
        const subCommands = (slash.options ?? []).filter(
          (o: any) => o.type === 1,
        );

        let options: any = [];
        let name: string;
        let description: string;
        if (subCommands.length > 0) {
          // eslint-disable-next-line no-restricted-syntax
          for (const subCmd of subCommands) {
            options = subCmd.options ?? [];
            options = options
              .map(
                (o: any) =>
                  `${o.required ? '<' : '['}${o.name}${o.required ? '>' : ']'}`,
              )
              .join(' ');

            name = `/${slash.name} ${subCmd.name} ${options}`;
            description = `${subCmd.description}`;

            if (name.length > biggestNameLength)
              biggestNameLength = name.length;
            if (description.length > biggestDescriptionLength)
              biggestDescriptionLength = description.length;

            cmds.push({
              name,
              description,
            });
          }
        } else {
          options = slash.options;
          options = options
            .map(
              (o: any) =>
                `${o.required ? '<' : '['}${o.name}${o.required ? '>' : ']'}`,
            )
            .join(' ');

          name = `/${slash.name} ${options}`;
          description = `${slash.description}`;

          if (name.length > biggestNameLength) biggestNameLength = name.length;
          if (description.length > biggestDescriptionLength)
            biggestDescriptionLength = description.length;

          cmds.push({
            name,
            description,
          });
        }
      }

      let table = `| ${'Command'.padEnd(
        biggestNameLength,
      )} | ${'Description'.padEnd(biggestDescriptionLength)} |\n| ${'-'.repeat(
        biggestNameLength,
      )} | ${'-'.repeat(biggestDescriptionLength)} |\n`;
      table += cmds
        .map(
          (cmd) =>
            `| \`${cmd.name.padEnd(
              biggestNameLength,
            )}\` | ${cmd.description.padEnd(biggestDescriptionLength)} |`,
        )
        .join('\n');

      const att = new MessageAttachment(Buffer.from(table), 'commands.md');

      await msg.reply({
        files: [att],
      });
    }
  },
};

export default Event;
