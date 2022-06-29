import {
  MessageEmbed,
  MessageButton,
  MessageSelectMenu,
  Modal,
  TextInputComponent,
  MessageActionRow,
  ModalActionRowComponent,
  Message,
  MessageAttachment,
  SelectMenuInteraction,
} from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

import type { ICommand } from '../../structures/Command';
import type { IEpicAccount } from '../../database/models/typings';
import Emojis from '../../resources/Emojies';

const Command: ICommand = {
  name: 'logout',
  category: 'account',

  slashCommandBuilder: new SlashCommandBuilder()
    .setName('logout')
    .setDescription('Logout a saved epic account from bot.'),

  options: {},

  run: async (bot, interaction, user) => {
    if (user.epicAccounts.length === 0) {
      await interaction.editReply('You have no saved epic accounts.');
      return;
    }

    const embed = new MessageEmbed()
      .setAuthor({
        name: `${interaction.user.username}'s Saved Accounts`,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
      })
      .setDescription(
        `To logout from an account use the drop down menu below.
        This message will timeout in 60 Seconds.`,
      )
      .setColor(bot._config.color);

    const closeButton = new MessageButton()
      .setCustomId('close')
      .setLabel('Close')
      .setEmoji(Emojis.cross)
      .setStyle('DANGER');

    const accountsMenu = new MessageSelectMenu()
      .setCustomId('accountsMenu')
      .setPlaceholder('Select an account')
      .setDisabled(user.epicAccounts.length === 0)
      .setOptions(
        user.epicAccounts.map((account: any) => ({
          value: account.accountId,
          label: account.displayName,
          description: account.accountId,
          default: user.selectedEpicAccount === account.accountId,
        })),
      );

    const components = [];
    components.push(new MessageActionRow().addComponents(accountsMenu));
    components.push(new MessageActionRow().addComponents(closeButton));

    await interaction.editReply({
      embeds: [embed],
      components,
    });

    const msg = (await interaction.fetchReply()) as Message;

    const selected = await msg
      .awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id,
        time: 60 * 1000,
      })
      .catch(() => null);

    if (!selected || selected.customId === 'close') {
      await interaction.deleteReply().catch(() => {});
      return;
    }

    const selectedEpicAccount = (user.epicAccounts as IEpicAccount[]).find(
      (a) => a.accountId === (selected as SelectMenuInteraction).values[0],
    );

    if (!selectedEpicAccount) {
      throw new Error('Invalid Epic Account');
    }

    user.selectedEpicAccount = '';
    user.epicAccounts = (user.epicAccounts as IEpicAccount[])
      .filter((a: any) => a.accountId !== selectedEpicAccount.accountId)
      .map((a: any) => a._id);
    await user.save();

    const selectedEmbed = new MessageEmbed()
      .setAuthor({
        name: `${interaction.user.username}'s Saved Accounts`,
        iconURL: interaction.user.displayAvatarURL({
          dynamic: true,
        }),
      })
      .setColor(bot._config.color)
      .setTimestamp()
      .setThumbnail(selectedEpicAccount.avatarUrl)
      .setDescription(
        `${Emojis.tick} Successfully logged out of **${selectedEpicAccount.displayName}**.`,
      );

    await interaction.editReply({
      embeds: [selectedEmbed],
      components: [],
    });
  },
};

export default Command;
