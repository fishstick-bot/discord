import { MessageAttachment } from 'discord.js';

import type { ILegacyCommand } from '../../structures/LegacyCommand';

const Command: ILegacyCommand = {
  name: 'generatedocs',

  options: {
    ownerOnly: true,
  },

  run: async (bot, msg, user, guild) => {
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

          if (name.length > biggestNameLength) biggestNameLength = name.length;
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
  },
};

export default Command;
