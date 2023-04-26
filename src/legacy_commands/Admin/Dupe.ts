/* eslint-disable no-await-in-loop */
import { time } from 'discord.js';
import { Endpoints, Client } from 'fnbr';
import { promisify } from 'util';

import type { ILegacyCommand } from '../../structures/LegacyCommand';
import type { IEpicAccount } from '../../database/models/typings';
import Emojis from '../../resources/Emojis';

const ALLOWED_USERS = [
  '1044582455287488582',
  '580465678046199840',
  '808718244655398923',
];

const sleep = promisify(setTimeout);

const getItems = async (
  client: Client,
  accountId: string,
  profileId: string,
) => {
  const res = await client.http.sendEpicgamesRequest(
    true,
    'POST',
    `${Endpoints.MCP}/${accountId}/client/QueryProfile?profileId=${profileId}`,
    'fortnite',
    { 'Content-Type': 'application/json' },
    {},
  );

  if (res.error) {
    throw new Error(res.error.message ?? res.error.code);
  }

  const items = (
    Object.keys(res.response?.profileChanges[0]?.profile?.items ?? {}) ?? []
  ).map((id: string) => {
    const i = (res.response?.profileChanges[0]?.profile?.items ?? {})[id];

    return {
      id,
      templateId: i.templateId,
      quantity: i.quantity,
    };
  });

  const profileLock = new Date(
    res.response.profileChanges[0].profile.profileLockExpiration,
  );

  return { items, profileLock };
};

const Command: ILegacyCommand = {
  name: 'dupe',

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

      await reply.edit(`Loading inventory${Emojis.loading}`);

      let success = false;
      let tries = 0;
      let content = '';

      while (!success && tries < 20) {
        tries += 1;

        const { items: backpack, profileLock } = await getItems(
          client,
          epicAccount.accountId,
          'theater0',
        );
        const modItems = backpack.filter((i) => i.templateId.includes('wid'));

        if (modItems.length === 0) {
          await reply.edit("You don't have any weapons in your backpack.");
          break;
        }

        const timeLeft = profileLock.getTime() - Date.now();

        if (timeLeft > 0) {
          await reply.edit({
            content: `${
              content ? '' : `${content}\n`
            }TRY ${tries} - Profile lock expires ${time(profileLock, 'R')}${
              Emojis.loading
            }`,
          });

          await sleep(timeLeft);
        }

        const res = await client.http.sendEpicgamesRequest(
          true,
          'POST',
          `${Endpoints.MCP}/${epicAccount.accountId}/client/StorageTransfer?profileId=theater0`,
          'fortnite',
          { 'Content-Type': 'application/json' },
          {
            transferOperations: [
              {
                itemId: modItems[0].id,
                quantity: 1,
                toStorage: true,
                newItemIdHint: '',
              },
            ],
          },
        );

        if (!res.error) {
          content = `${
            content ? '' : `${content}\n`
          }TRY ${tries} - Failed to dupe.❌`;
          await reply.edit({ content });
          return;
        }

        success = true;
        content = `${
          content ? '' : `${content}\n`
        }TRY ${tries} - Successfully duped!✅`;
        await reply.edit({ content });
      }
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
