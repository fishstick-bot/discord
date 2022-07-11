import {
  MessageActionRow,
  MessageButton,
  MessageEmbed,
  Message,
} from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { Endpoints, STWProfile } from 'fnbr';

import type { ICommand } from '../../structures/Command';
import type { IEpicAccount } from '../../database/models/typings';
import Emojis from '../../resources/Emojis';
import getLogger from '../../Logger';
import { handleCommandError } from '../../lib/Utils';

const Command: ICommand = {
  name: 'upgrade',

  slashCommandBuilder: new SlashCommandBuilder()
    .setName('upgrade')
    .setDescription('Upgrade your Save the World skilltree.'),

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

    const getCurrentLvl = (id: string) => {
      const found = stw.items.find((i) => i.templateId === id)?.quantity ?? 0;
      return found;
    };

    const createBtn = (
      id: string,
      emoji: string,
      label: string,
      disabled = false,
    ) => {
      const btn = new MessageButton()
        .setCustomId(id)
        .setEmoji(emoji)
        .setLabel(label)
        .setDisabled(disabled)
        .setStyle('SECONDARY');

      return btn;
    };

    const createComponents = (disabled = false) => {
      const teleporter = createBtn(
        'HomebaseNode:skilltree_teleporter',
        Emojis.teleporter,
        `${getCurrentLvl('HomebaseNode:skilltree_teleporter')} / 6`,
        getCurrentLvl('HomebaseNode:skilltree_teleporter') === 6 || disabled,
      );
      const supplydrop = createBtn(
        'HomebaseNode:skilltree_supplydrop',
        Emojis.supplydrop,
        `${getCurrentLvl('HomebaseNode:skilltree_supplydrop')} / 6`,
        getCurrentLvl('HomebaseNode:skilltree_supplydrop') === 6 || disabled,
      );
      const slowfield = createBtn(
        'HomebaseNode:skilltree_slowfield',
        Emojis.slowfield,
        `${getCurrentLvl('HomebaseNode:skilltree_slowfield')} / 6`,
        getCurrentLvl('HomebaseNode:skilltree_slowfield') === 6 || disabled,
      );
      const proximity = createBtn(
        'HomebaseNode:skilltree_proximitymine',
        Emojis.proximity,
        `${getCurrentLvl('HomebaseNode:skilltree_proximitymine')} / 6`,
        getCurrentLvl('HomebaseNode:skilltree_proximitymine') === 6 || disabled,
      );
      const turret = createBtn(
        'HomebaseNode:skilltree_hoverturret',
        Emojis.hoverturret,
        `${getCurrentLvl('HomebaseNode:skilltree_hoverturret')} / 6`,
        getCurrentLvl('HomebaseNode:skilltree_hoverturret') === 6 || disabled,
      );
      const banner = createBtn(
        'HomebaseNode:skilltree_banner',
        Emojis.banner,
        `${getCurrentLvl('HomebaseNode:skilltree_banner')} / 6`,
        getCurrentLvl('HomebaseNode:skilltree_banner') === 6 || disabled,
      );
      const airstrike = createBtn(
        'HomebaseNode:skilltree_airstrike',
        Emojis.airstrike,
        `${getCurrentLvl('HomebaseNode:skilltree_airstrike')} / 6`,
        getCurrentLvl('HomebaseNode:skilltree_airstrike') === 6 || disabled,
      );
      const adrenaline = createBtn(
        'HomebaseNode:skilltree_adrenalinerush',
        Emojis.adrenaline,
        `${getCurrentLvl('HomebaseNode:skilltree_adrenalinerush')} / 6`,
        getCurrentLvl('HomebaseNode:skilltree_adrenalinerush') === 6 ||
          disabled,
      );
      const storage = createBtn(
        'HomebaseNode:skilltree_stormshieldstorage',
        Emojis.storagesize,
        `${getCurrentLvl('HomebaseNode:skilltree_stormshieldstorage')} / 8`,
        getCurrentLvl('HomebaseNode:skilltree_stormshieldstorage') === 8 ||
          disabled,
      );
      const pickaxe = createBtn(
        'HomebaseNode:skilltree_pickaxe',
        Emojis.pickaxe,
        `${getCurrentLvl('HomebaseNode:skilltree_pickaxe')} / 8`,
        getCurrentLvl('HomebaseNode:skilltree_pickaxe') === 8 || disabled,
      );
      const buildinghealth = createBtn(
        'HomebaseNode:skilltree_buildinghealth',
        Emojis.buildinghealth,
        `${getCurrentLvl('HomebaseNode:skilltree_buildinghealth')} / 8`,
        getCurrentLvl('HomebaseNode:skilltree_buildinghealth') === 8 ||
          disabled,
      );
      const buildandrepairspeed = createBtn(
        'HomebaseNode:skilltree_buildandrepairspeed',
        Emojis.buildrepairspeed,
        `${getCurrentLvl('HomebaseNode:skilltree_buildandrepairspeed')} / 8`,
        getCurrentLvl('HomebaseNode:skilltree_buildandrepairspeed') === 8 ||
          disabled,
      );
      const backpack = createBtn(
        'HomebaseNode:skilltree_backpacksize',
        Emojis.backpacksize,
        `${getCurrentLvl('HomebaseNode:skilltree_backpacksize')} / 8`,
        getCurrentLvl('HomebaseNode:skilltree_backpacksize') === 8 || disabled,
      );
      const closeButton = new MessageButton()
        .setCustomId('close')
        .setLabel('Close')
        .setEmoji(Emojis.cross)
        .setStyle('DANGER')
        .setDisabled(disabled);

      return [
        new MessageActionRow().setComponents(teleporter, supplydrop, slowfield),
        new MessageActionRow().setComponents(proximity, turret, banner),
        new MessageActionRow().setComponents(airstrike, adrenaline, storage),
        new MessageActionRow().setComponents(
          pickaxe,
          buildinghealth,
          buildandrepairspeed,
        ),
        new MessageActionRow().setComponents(backpack, closeButton),
      ];
    };

    await interaction.editReply({
      content: `**${epicAccount.displayName}'s STW Upgrades**`,
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
          `${Endpoints.MCP}/${epicAccount.accountId}/client/PurchaseOrUpgradeHomebaseNode?profileId=campaign`,
          'fortnite',
          {
            'Content-Type': 'application/json',
          },
          {
            nodeId: i.customId,
          },
        );
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
