import { MessageAttachment } from 'discord.js';

import type { ILegacyCommand } from '../../structures/LegacyCommand';
import type { IEpicAccount } from '../../database/models/typings';

const Command: ILegacyCommand = {
  name: 'dumpauths',

  options: {},

  run: async (bot, msg, user) => {
    const epicAccounts = (user.epicAccounts as IEpicAccount[]).map((a) => ({
      accountId: a.accountId,
      deviceId: a.deviceId,
      secret: a.secret,
      displayName: a.displayName,
    }));

    const att = new MessageAttachment(
      Buffer.from(JSON.stringify(epicAccounts, null, 2)),
      `${user.id}-auths.json`,
    );

    await msg.reply({
      files: [att],
    });
  },
};

export default Command;
