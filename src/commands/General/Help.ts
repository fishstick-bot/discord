import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import type { ICommand } from '../../structures/Command';
import Emojis from '../../resources/Emojis';
import Pagination from '../../lib/Pagination';

const Command: ICommand = {
  name: 'help',

  slashCommandBuilder: new SlashCommandBuilder()
    .setName('help')
    .setDescription("Get information about Fishstick's commands"),

  options: {},

  run: async (bot, interaction) => {
    const pages: EmbedBuilder[] = [];

    const sortedCommands = bot.commands.sort((a, b) => {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });

    for (let i = 0; i < bot.commands.size; i += 9) {
      const cmds = sortedCommands.toJSON().slice(i, i + 9);

      const embed = new EmbedBuilder()
        .setAuthor({
          name: 'Help Information',
          iconURL: bot.user?.displayAvatarURL(),
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
Checkout my **[Documentation](https://docs.fishstickbot.com/commands)** for more information.

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

        embed.addFields({
          name: `/${slash.name}${
            cmd.options.premiumOnly ? ` ${Emojis.star}` : ''
          }`,
          value: cmdInfo,
          inline: true,
        });
      }

      pages.push(embed);
    }

    const pagination = new Pagination(pages, 5 * 60 * 1000);
    await pagination.start(interaction);
  },
};

export default Command;
