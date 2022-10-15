/* eslint-disable no-param-reassign */
import {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  SelectMenuBuilder,
  ActionRowBuilder,
  Message,
  SelectMenuInteraction,
  SlashCommandBuilder,
} from 'discord.js';

import type { ICommand } from '../../structures/Command';
import Emojis from '../../resources/Emojis';
import getLogger from '../../Logger';
import { handleCommandError } from '../../lib/Utils';

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

    const createComponents = (): ActionRowBuilder<
      ButtonBuilder | SelectMenuBuilder
    >[] => {
      const row = new ActionRowBuilder<ButtonBuilder>();

      const autoDailyButton = new ButtonBuilder()
        .setCustomId('autoDaily')
        .setLabel(
          `${epicAccount.autoDaily ? 'Disable' : 'Enable'} Daily Login Rewards`,
        )
        .setStyle(
          epicAccount.autoDaily ? ButtonStyle.Danger : ButtonStyle.Success,
        );

      const autoFreeLlamasButton = new ButtonBuilder()
        .setCustomId('autoFreeLlamas')
        .setLabel(
          `${epicAccount.autoFreeLlamas ? 'Disable' : 'Enable'} Freebie Llamas`,
        )
        .setStyle(
          epicAccount.autoFreeLlamas ? ButtonStyle.Danger : ButtonStyle.Success,
        )
        .setDisabled(!isPremium);

      const autoResearchMenu = new SelectMenuBuilder()
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

      const row2 = new ActionRowBuilder<SelectMenuBuilder>().addComponents(
        autoResearchMenu,
      );

      const notificationsButton = new ButtonBuilder()
        .setCustomId('notifications')
        .setLabel(
          `${user.notifications ? 'Disable' : 'Enable'} DM Notifications`,
        )
        .setStyle(
          user.notifications ? ButtonStyle.Danger : ButtonStyle.Success,
        );

      const closeButton = new ButtonBuilder()
        .setCustomId('close')
        .setLabel('Close')
        .setEmoji(Emojis.cross)
        .setStyle(ButtonStyle.Danger);

      const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        notificationsButton,
        closeButton,
      );

      return [row, row2, row3];
    };

    const createEmbed = () => {
      const embed = new EmbedBuilder()
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

• **Notifications**: ${user.notifications ? 'Enabled' : 'Disabled'}

**Make sure to join our [support server](https://discord.gg/fishstick) to see your auto daily/freebie llamas rewards!**

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
      try {
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
        } else if (i.customId === 'notifications') {
          user.notifications = !user.notifications;
          await user.save();

          await interaction.editReply({
            embeds: [createEmbed()],
            components: createComponents(),
          });
        } else if (i.customId === 'close') {
          collector.stop();
        }
      } catch (e) {
        await handleCommandError(
          bot,
          user,
          getLogger('COMMAND'),
          interaction,
          e,
        );
        collector.stop('handleError');
      }
    });

    collector.on('end', async (collected, reason) => {
      if (reason === 'handleError') return;
      await interaction.deleteReply().catch(() => {});
    });
  },
};

export default Command;
