import { MessageEmbed, version } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

import type { ICommand } from '../../structures/Command';
import Emojis from '../../resources/Emojies';
import Pagination from '../../lib/Pagination';

const Command: ICommand = {
  name: 'help',

  slashCommandBuilder: new SlashCommandBuilder()
    .setName('help')
    .setDescription("Get information about Fishstick's commands"),

  options: {},

  run: async (bot, interaction) => {
    const pages: MessageEmbed[] = [];

    const sortedCommands = bot.commands.sort((a, b) => {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });

    for (let i = 0; i < bot.commands.size; i += 9) {
      const cmds = sortedCommands.toJSON().slice(i, i + 9);

      const embed = new MessageEmbed()
        .setAuthor({
          name: 'Help Information',
          iconURL: bot.user?.displayAvatarURL({ dynamic: true }),
        })
        .setTimestamp()
        .setColor(bot._config.color)
        .setFooter({
          text: `Page ${i / 9 + 1} of ${Math.ceil(bot.commands.size / 9)} • ${
            bot.commands.size
          } Commands`,
        })
        .setDescription(
          `**Fishstick**
            **[Invite me](https://fishstickbot.com/invite)** to your server
            Join our **[Support Server](https://discord.gg/fishstick)**
            Follow us on **[Twitter](https://twitter.com/FishstickBot)**.
            
            **Commands • ${bot.commands.size}**
            • ${Emojis.star} - Premium Commands
            • ⏱️ - ${bot.cooldown}s Cooldown (Regular)
            • ⏱️ - ${bot.cooldown / 2}s Cooldown (Premium)`,
        );

      // eslint-disable-next-line no-restricted-syntax
      for (const cmd of cmds) {
        const slash: any = cmd.slashCommandBuilder.toJSON();
        const subCommands = slash.options.filter((o: any) => o.type === 1);

        let cmdInfo = `${slash.description}`;
        if (subCommands.length > 0) {
          cmdInfo += `\n${subCommands.map((c: any) => c.name).join(' • ')}`;
        }

        embed.addField(
          `/${slash.name}${cmd.options.premiumOnly ? ` ${Emojis.star}` : ''}`,
          cmdInfo,
          true,
        );
      }

      pages.push(embed);
    }

    const pagination = new Pagination(pages, 5 * 60 * 1000);
    await pagination.start(interaction);
  },
};

export default Command;
