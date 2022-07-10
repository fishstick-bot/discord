import { MessageEmbed, TextChannel } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

import type { ICommand } from '../../structures/Command';
import Emojis from '../../resources/Emojis';

const Command: ICommand = {
  name: 'suggest',

  slashCommandBuilder: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Suggest any feature for bot.')
    .addStringOption((o) =>
      o
        .setName('suggestion')
        .setDescription('Suggestion to be made.')
        .setRequired(true),
    ),

  options: {},

  run: async (bot, interaction) => {
    const suggestion = interaction.options.getString('suggestion', true);

    const suggestionEmbed = new MessageEmbed()
      .setTimestamp()
      .setColor(bot._config.color)
      .setAuthor({
        name: interaction.user.tag,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
      })
      .setDescription(suggestion);

    const suggestionChannel = (await bot.channels.fetch(
      bot._config.suggestionsChannel,
    ))! as TextChannel;

    const msg = await suggestionChannel.send({
      embeds: [suggestionEmbed],
    });
    await msg.react(Emojis.tick);
    await msg.react(Emojis.cross);

    await interaction.editReply(`Suggestion sent!`);
  },
};

export default Command;
