/* eslint-disable no-param-reassign */
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

const capitalizeFirst = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1);

const Command: ICommand = {
  name: 'settings',

  slashCommandBuilder: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Change your profile and account settings.'),

  options: {
    needsEpicAccount: true,
  },

  run: async (bot, interaction, user) => {
    const isPremium =
      user.premiumUntil.getTime() > Date.now() || user.isPartner;

    const epicAccount = await bot.epicAccountModel
      .findOne({
        accountId: user.selectedEpicAccount,
      })
      .exec();

    if (!epicAccount) {
      throw new Error(
        'You must have an Epic account logged in to use this command. Use `/login` to log in.',
      );
    }

    const toggleAutoDaily = async () => {
      epicAccount.autoDaily = !epicAccount.autoDaily;
      await epicAccount.save();

      return epicAccount.autoDaily;
    };

    const toggleAutoFreeLlamas = async () => {
      epicAccount.autoFreeLlamas = !epicAccount.autoFreeLlamas;
      await epicAccount.save();

      return epicAccount.autoFreeLlamas;
    };

    const createComponents = () => {
      const row = new MessageActionRow();

      const autoDailyButton = new MessageButton()
        .setCustomId('autoDaily')
        .setLabel(
          `${epicAccount.autoDaily ? 'Disable' : 'Enable'} Daily Login Rewards`,
        )
        .setStyle(epicAccount.autoDaily ? 'DANGER' : 'SUCCESS');

      const autoFreeLlamasButton = new MessageButton()
        .setCustomId('autoFreeLlamas')
        .setLabel(
          `${epicAccount.autoFreeLlamas ? 'Disable' : 'Enable'} Freebie Llamas`,
        )
        .setStyle(epicAccount.autoFreeLlamas ? 'DANGER' : 'SUCCESS')
        .setDisabled(!isPremium);

      const autoResearchMenu = new MessageSelectMenu()
        .setCustomId('autoResearch')
        .setPlaceholder('Select Auto Research Mode')
        .setDisabled(!isPremium)
        .setOptions(
          ['fortitude', 'offense', 'resistance', 'tech', 'auto', 'none'].map(
            (o) => ({
              value: o,
              label: capitalizeFirst(o),
              default: epicAccount.autoResearch === o,
              emoji: (Emojis as any)[o] ?? Emojis.research,
            }),
          ),
        );

      row.addComponents(autoDailyButton, autoFreeLlamasButton);

      const row2 = new MessageActionRow().addComponents(autoResearchMenu);

      return [row, row2];
    };

    const createEmbed = () => {
      const embed = new MessageEmbed()
        .setAuthor({
          name: `${epicAccount.displayName}'s Settings`,
          iconURL: epicAccount.avatarUrl,
        })
        .setColor(bot._config.color)
        .setTimestamp()
        .setFooter({
          text: `Account ID: ${epicAccount.accountId}`,
        })
        .setDescription(
          `• ${Emojis.star} - Needs premium.

• **Automatic Daily Login Reward**: ${
            epicAccount.autoDaily ? 'Enabled' : 'Disabled'
          }
• **Automatic Freebie Llamas**: ${
            epicAccount.autoFreeLlamas ? 'Enabled' : 'Disabled'
          } ${Emojis.star}
• **Auto Research**: ${capitalizeFirst(epicAccount.autoResearch)} ${Emojis.star}

**Click any button to enable/disable setting.**
**This message will timeout in 60 seconds.**`,
        );

      return embed;
    };

    await interaction.editReply({
      embeds: [createEmbed()],
      components: createComponents(),
    });

    const msg = (await interaction.fetchReply()) as Message;

    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 60 * 1000,
    });

    collector.on('collect', async (i) => {
      if (i.customId === 'autoDaily') {
        await toggleAutoDaily();
        await interaction.editReply({
          embeds: [createEmbed()],
          components: createComponents(),
        });
      } else if (i.customId === 'autoFreeLlamas') {
        await toggleAutoFreeLlamas();
        await interaction.editReply({
          embeds: [createEmbed()],
          components: createComponents(),
        });
      } else if (i.customId === 'autoResearch') {
        const option = (i as SelectMenuInteraction).values[0] as
          | 'fortitude'
          | 'offense'
          | 'resistance'
          | 'tech'
          | 'auto'
          | 'none';
        epicAccount.autoResearch = option;
        await epicAccount.save();

        await interaction.editReply({
          embeds: [createEmbed()],
          components: createComponents(),
        });
      }
    });

    collector.on('end', async (collected, reason) => {
      await interaction.deleteReply().catch(() => {});
    });
  },
};

export default Command;
