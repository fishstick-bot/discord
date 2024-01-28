/* eslint-disable no-await-in-loop */
import { time } from 'discord.js';
import { Endpoints, Client } from 'fnbr';
import { promisify } from 'util';

import type { ILegacyCommand } from '../../structures/LegacyCommand';
import type { IEpicAccount } from '../../database/models/typings';
import Emojis from '../../resources/Emojis';

const ALLOWED_USERS = ['580465678046199840'];

const changeHeroLoadout = async (
  client: Client,
  accountId: string,
  loadoutId: string,
) => {
  await client.http.sendEpicgamesRequest(
    true,
    'POST',
    `${Endpoints.MCP}/${accountId}/client/SetActiveHeroLoadout?profileId=campaign`,
    'fortnite',
    {
      'Content-Type': 'application/json',
    },
    {
      selectedLoadout: loadoutId,
    },
  );
};

const Command: ILegacyCommand = {
  name: 'fastswitch',

  options: {},

  run: async (bot, msg, user) => {
    if (!ALLOWED_USERS.includes(msg.author.id)) {
      return;
    }

    const epicAccount = (user.epicAccounts as IEpicAccount[]).find(
      (a) => a.accountId === user.selectedEpicAccount,
    );

    if (!epicAccount) {
      throw new Error(
        'You must have an Epic account logged in to use this command. Use `/login` to log in.',
      );
    }

    const reply = await msg.reply(`Connecting to Epic Games${Emojis.loading}`);

    try {
      const client = await bot.fortniteManager.clientFromDeviceAuth(
        epicAccount.accountId,
        epicAccount.deviceId,
        epicAccount.secret,
      );

      const stw = await client.getSTWProfile(epicAccount.accountId);

      const tutorialCompleted =
        (stw!.items.find((i) => i.templateId === 'Quest:homebaseonboarding')
          ?.attributes.completion_hbonboarding_completezone ?? 0) > 0;

      if (!tutorialCompleted) {
        throw new Error(
          `You must complete your tutorial before you can view your stats.`,
        );
      }

      await reply.edit(`[0/125] Fast Switching${Emojis.loading}`);

      const currentLoadout = stw.heroLoadouts.find(
        (l) => l.id === stw.stats.stwLoadout.selectedHeroLoadout,
      );

      for (let i = 0; i < 125; i += 1) {
        const randomLoadoutIdx = Math.floor(
          Math.random() * stw.heroLoadouts.length,
        );
        const loadout = stw.heroLoadouts[randomLoadoutIdx];

        await changeHeroLoadout(client, epicAccount.accountId, loadout.id);

        if (i % 5 === 0) {
          await reply.edit(`[${i}/125] Fast Switching${Emojis.loading}`);
        }
      }

      await changeHeroLoadout(
        client,
        epicAccount.accountId,
        currentLoadout!.id,
      );

      await reply.edit('Done!');
    } catch (e: any) {
      await reply.edit(`Error: ${e}

        **Stack**
        \`\`\`
        ${e.stack}
        \`\`\``);
    }
  },
};

export default Command;
