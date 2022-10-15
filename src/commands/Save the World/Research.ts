import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Message,
  SlashCommandBuilder,
} from 'discord.js';
import { Endpoints, STWProfile } from 'fnbr';

import type { ICommand } from '../../structures/Command';
import type { IEpicAccount } from '../../database/models/typings';
import Emojis from '../../resources/Emojis';
import getLogger from '../../Logger';
import { handleCommandError } from '../../lib/Utils';

const Command: ICommand = {
  name: 'research',

  slashCommandBuilder: new SlashCommandBuilder()
    .setName('research')
    .setDescription('Upgrade a Save the World research stat.'),

  options: {
    needsEpicAccount: true,
  },

  run: async (bot, interaction, user) => {
    const epicAccount = (user.epicAccounts as IEpicAccount[]).find(
      (a) => a.accountId === user.selectedEpicAccount,
    );

    if (!epicAccount) {
      throw new Error(
        'You must have an Epic account logged in to use this command. Use `/login` to log in.',
      );
    }

    await interaction.editReply(`Connecting to Epic Games${Emojis.loading}`);

    const client = await bot.fortniteManager.clientFromDeviceAuth(
      epicAccount.accountId,
      epicAccount.deviceId,
      epicAccount.secret,
    );

    let stw: STWProfile = await client.getSTWProfile(epicAccount.accountId);
    const refreshSTWProfile = async () => {
      stw = await client.getSTWProfile(epicAccount.accountId);
    };

    const tutorialCompleted =
      (stw!.items.find((i) => i.templateId === 'Quest:homebaseonboarding')
        ?.attributes.completion_hbonboarding_completezone ?? 0) > 0;

    if (!tutorialCompleted) {
      throw new Error(
        `You must complete your tutorial before you can view your stats.`,
      );
    }

    const createBtn = (
      id: string,
      emoji: string,
      label?: string,
      disabled = false,
      style: ButtonStyle = ButtonStyle.Secondary,
    ) => {
      const btn = new ButtonBuilder()
        .setCustomId(id)
        .setEmoji(emoji)
        .setDisabled(disabled)
        .setStyle(style);

      if (btn) {
        if (label) {
          btn.setLabel(label);
        }
      }

      return btn;
    };

    const createComponents = (disabled = false) => {
      const research = stw.stats.researchLevels;
      const researchPoints =
        stw.items.find(
          (i) => i.templateId === 'Token:collectionresource_nodegatetoken01',
        )?.quantity ?? 0;

      const fortitude = createBtn(
        'fortitude',
        Emojis.fortitude,
        `${research?.fortitude ?? 0}`,
        disabled || research?.fortitude === 120,
      );
      const offense = createBtn(
        'offense',
        Emojis.offense,
        `${research?.offense ?? 0}`,
        disabled || research?.offense === 120,
      );
      const resistance = createBtn(
        'resistance',
        Emojis.resistance,
        `${research?.resistance ?? 0}`,
        disabled || research?.resistance === 120,
      );
      const tech = createBtn(
        'technology',
        Emojis.tech,
        `${research?.technology ?? 0}`,
        disabled || research?.technology === 120,
      );
      const researchBtn = createBtn(
        'research',
        Emojis.research,
        `${researchPoints.toLocaleString()}`,
        disabled,
      );

      const closeButton = createBtn(
        'close',
        Emojis.cross,
        undefined,
        disabled,
        ButtonStyle.Danger,
      );

      return [
        new ActionRowBuilder<ButtonBuilder>().setComponents(fortitude, offense),
        new ActionRowBuilder<ButtonBuilder>().setComponents(resistance, tech),
        new ActionRowBuilder<ButtonBuilder>().setComponents(
          researchBtn,
          closeButton,
        ),
      ];
    };

    await interaction.editReply({
      content: `**${epicAccount.displayName}'s STW Research**`,
      components: createComponents(),
    });

    const msg = (await interaction.fetchReply()) as Message;

    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 5 * 60 * 1000,
    });

    collector.on('collect', async (i) => {
      try {
        switch (i.customId) {
          case 'close':
            collector.stop();
            return;
        }

        if (i.customId !== 'research') {
          const res = await client.http.sendEpicgamesRequest(
            true,
            'POST',
            `${Endpoints.MCP}/${epicAccount.accountId}/client/PurchaseResearchStatUpgrade?profileId=campaign`,
            'fortnite',
            {
              'Content-Type': 'application/json',
            },
            {
              statId: i.customId,
            },
          );

          if (res.error) {
            await interaction.followUp(res.error.message);
          }
        } else {
          const researchCollector =
            stw.items.find(
              (z) =>
                z.templateId ===
                'CollectedResource:Token_collectionresource_nodegatetoken01',
            )?.id ?? null;

          if (researchCollector) {
            const res = await client.http.sendEpicgamesRequest(
              true,
              'POST',
              `${Endpoints.MCP}/${epicAccount.accountId}/client/ClaimCollectedResources?profileId=campaign`,
              'fortnite',
              {
                'Content-Type': 'application/json',
              },
              {
                collectorsToClaim: [researchCollector],
              },
            );

            if (res.error) {
              await interaction.followUp(res.error.message);
            }
          }
        }
        await refreshSTWProfile();

        await interaction.editReply({
          components: createComponents(),
        });
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
      await interaction
        .editReply({
          content: ' ',
          components: createComponents(true),
        })
        .catch(() => {});
    });
  },
};

export default Command;
