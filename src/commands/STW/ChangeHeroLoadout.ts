import {
  MessageActionRow,
  MessageButton,
  Message,
  MessageButtonStyleResolvable,
} from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { Endpoints, STWProfile } from 'fnbr';
import { promises as fs } from 'fs';

import type { ICommand } from '../../structures/Command';
import type { IEpicAccount } from '../../database/models/typings';
import Emojis from '../../resources/Emojis';
import getLogger from '../../Logger';
import { handleCommandError } from '../../lib/Utils';

const Command: ICommand = {
  name: 'change-hero-loadout',

  slashCommandBuilder: new SlashCommandBuilder()
    .setName('change-hero-loadout')
    .setDescription(
      'Switch your active hero loadout in Fortnite Save the World.',
    ),

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

    const stwData = JSON.parse(await fs.readFile('assets/STW.json', 'utf-8'));

    const createBtn = (
      id: string,
      emoji: string,
      label?: string,
      disabled = false,
      style: MessageButtonStyleResolvable = 'SECONDARY',
    ) => {
      const btn = new MessageButton()
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
      const heroloadouts = stw.heroLoadouts;

      const rows = [];

      for (let i = 0; i < heroloadouts.length; i += 3) {
        const row = new MessageActionRow();

        for (let j = 0; j < 3; j += 1) {
          const loadout = heroloadouts.slice(i, i + 3)[j];
          const commander = stw.heroes.find(
            (h) => h.id === loadout.commanderSlot,
          )!;

          row.addComponents(
            new MessageButton()
              .setCustomId(loadout.id)
              .setDisabled(disabled)
              .setStyle('SECONDARY')
              .setLabel(
                `${commander.powerLevel}⚡️ ${
                  stwData[commander.templateId.split(':')[1].toLowerCase()]
                    ?.name ?? commander.templateId.split(':')[1]
                }`,
              ),
          );
        }

        rows.push(row);
      }

      const closeButton = createBtn(
        'close',
        Emojis.cross,
        'Close',
        disabled,
        'DANGER',
      );

      rows.push(new MessageActionRow().addComponents(closeButton));

      return rows;
    };

    await interaction.editReply({
      content: `**${epicAccount.displayName}'s STW Hero Loadout**`,
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

        await client.http.sendEpicgamesRequest(
          true,
          'POST',
          `${Endpoints.MCP}/${epicAccount.accountId}/client/SetActiveHeroLoadout?profileId=campaign`,
          'fortnite',
          {
            'Content-Type': 'application/json',
          },
          {
            selectedLoadout: i.customId,
          },
        );

        await interaction.editReply({
          components: createComponents(),
        });
      } catch (e) {
        await handleCommandError(getLogger('COMMAND'), interaction, e);
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
