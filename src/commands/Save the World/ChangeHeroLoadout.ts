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
    premiumOnly: true,
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

    const stw: STWProfile = await client.getSTWProfile(epicAccount.accountId);

    const tutorialCompleted =
      (stw!.items.find((i) => i.templateId === 'Quest:homebaseonboarding')
        ?.attributes.completion_hbonboarding_completezone ?? 0) > 0;

    if (!tutorialCompleted) {
      throw new Error(
        `You must complete your tutorial before you can view your stats.`,
      );
    }

    const stwData = JSON.parse(await fs.readFile('assets/STW.json', 'utf-8'));

    let { selectedHeroLoadout } = stw.stats.stwLoadout;
    const createComponents = (disabled = false) => {
      const heroloadouts = stw.heroLoadouts;

      if (heroloadouts.length === 0) {
        throw new Error(
          'You do not have any hero loadouts. You must create one before you can change it.',
        );
      }

      const rows = [];

      for (let i = 0; i < heroloadouts.length; i += 3) {
        const row = new MessageActionRow();

        for (let j = 0; j < heroloadouts.slice(i, i + 3).length; j += 1) {
          const loadout = heroloadouts.slice(i, i + 3)[j];
          const commander = stw.heroes.find(
            (h) => h.id === loadout.commanderSlot,
          )!;

          row.addComponents(
            new MessageButton()
              .setCustomId(loadout.id)
              .setDisabled(disabled)
              .setStyle(
                selectedHeroLoadout === loadout.id ? 'SUCCESS' : 'SECONDARY',
              )
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

      const closeButton = new MessageButton()
        .setCustomId('close')
        .setEmoji(Emojis.cross)
        .setDisabled(disabled)
        .setStyle('DANGER')
        .setLabel('Close');

      rows.push(new MessageActionRow().addComponents(closeButton));

      return rows;
    };

    await interaction.editReply(
      'Sent hero loadout selection menu. Please select a hero loadout.',
    );

    const msg = (await (interaction.channel! ?? interaction.user).send({
      content: `**${epicAccount.displayName}'s STW Hero Loadout**`,
      components: createComponents(),
    })) as Message;

    const special = ['741898574815821868', '727224012912197652'];

    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: special.includes(interaction.user.id)
        ? 1.5 * 60 * 60 * 1000
        : 15 * 60 * 60 * 1000,
    });

    const cooldownTime = special.includes(interaction.user.id) ? 100 : 2000;
    let cooldown: number | null = null;
    collector.on('collect', async (i) => {
      try {
        switch (i.customId) {
          case 'close':
            collector.stop();
            return;
        }

        if (cooldown) {
          await i.followUp(
            `Please wait ${((cooldown - Date.now()) / 1000).toFixed(
              2,
            )}s before changing your loadout again.`,
          );
          return;
        }

        selectedHeroLoadout = i.customId;
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

        cooldown = Date.now() + cooldownTime;
        setTimeout(() => {
          cooldown = null;
        }, cooldownTime);

        await msg.edit({
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
      await msg
        .edit({
          content: ' ',
          components: createComponents(true),
        })
        .catch(() => {});
    });
  },
};

export default Command;
