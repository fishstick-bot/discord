/* eslint-disable no-case-declarations */
import {
  MessageActionRow,
  MessageSelectMenu,
  MessageButton,
  MessageEmbed,
  Message,
  SelectMenuInteraction,
} from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

import type { ICommand } from '../../structures/Command';
import type { IEpicAccount } from '../../database/models/typings';
import Emojis from '../../resources/Emojis';
import Pagination from '../../lib/Pagination';

const Command: ICommand = {
  name: 'friends',

  slashCommandBuilder: new SlashCommandBuilder()
    .setName('friends')
    .setDescription('Manage your fortnite friends'),
  options: {
    needsEpicAccount: true,
  },

  run: async (bot, interaction, user) => {
    const isPremium =
      user.premiumUntil.getTime() > Date.now() || user.isPartner;

    const epicAccount = (user.epicAccounts as IEpicAccount[]).find(
      (a) => a.accountId === user.selectedEpicAccount,
    );

    if (!epicAccount) {
      throw new Error(
        'You must have an Epic account logged in to use this command. Use `/login` to log in.',
      );
    }

    const client = await bot.fortniteManager.clientFromDeviceAuth(
      epicAccount.accountId,
      epicAccount.deviceId,
      epicAccount.secret,
    );
    await client.updateCaches();

    const embed = new MessageEmbed()
      .setAuthor({
        name: `${epicAccount.displayName}'s Friends`,
        iconURL: epicAccount.avatarUrl,
      })
      .setColor(bot._config.color)
      .setTimestamp()
      .setDescription('Choose any button to manage your friend list.');

    const viewFriendsButton = new MessageButton()
      .setLabel('View Friends')
      .setCustomId('view-friends')
      .setStyle('SECONDARY');

    const viewFriendRequestsButton = new MessageButton()
      .setLabel('View Friend Requests')
      .setCustomId('view-friend-requests')
      .setStyle('SECONDARY');

    const clearFriendsButton = new MessageButton()
      .setLabel('Clear Friends')
      .setCustomId('clear-friends')
      .setStyle('DANGER');

    const confirmBtn = new MessageButton()
      .setLabel('Confirm')
      .setCustomId('confirm')
      .setEmoji(Emojis.tick)
      .setStyle('SUCCESS');

    const cancelBtn = new MessageButton()
      .setLabel('Cancel')
      .setCustomId('cancel')
      .setEmoji(Emojis.cross)
      .setStyle('DANGER');

    await interaction.editReply({
      embeds: [embed],
      components: [
        new MessageActionRow().addComponents(
          viewFriendsButton,
          viewFriendRequestsButton,
        ),
        new MessageActionRow().addComponents(clearFriendsButton, cancelBtn),
      ],
    });

    const msg = (await interaction.fetchReply()) as Message;

    const selected = await msg
      .awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id,
        time: 60 * 1000,
      })
      .catch(() => null);

    if (!selected || selected.customId === 'cancel') {
      await interaction.deleteReply();
      return;
    }

    const confirmRow = new MessageActionRow().addComponents(
      confirmBtn,
      cancelBtn,
    );

    switch (selected!.customId) {
      case 'view-friends':
        if (client.friends.size === 0) {
          await interaction.editReply({
            embeds: [],
            components: [],
            content: 'You have no friends.',
          });
          return;
        }

        const friendPages: MessageEmbed[] = [];
        for (let i = 0; i < client.friends.size; i += 30) {
          const friends = client.friends.toJSON().slice(i, i + 30);

          const page = new MessageEmbed()
            .setAuthor({
              name: `${epicAccount.displayName}'s Friends`,
              iconURL: epicAccount.avatarUrl,
            })
            .setColor(bot._config.color)
            .setTimestamp()
            .setDescription('• * = Not eligible for gifting')
            .setFooter({
              text: `Page ${i / 30 + 1} of ${Math.ceil(
                client.friends.size / 30,
              )} • ${client.friends.size} Friends`,
            });

          for (let j = 0; j < friends.length; j += 15) {
            const row = friends.slice(j, j + 15);

            // a friend is eligible for gifting if they created for over 48 hours
            page.addField(
              `${i + j + 1} - ${i + j + row.length}`,
              row
                .map(
                  (f, idx) =>
                    `${i + j + 1 + idx}. ${f.displayName ?? `\`${f.id}\``}${
                      f.createdAt.getTime() > Date.now() - 48 * 60 * 60 * 1000
                        ? ' *'
                        : ''
                    }`,
                )
                .join('\n'),
              true,
            );
          }

          friendPages.push(page);
        }

        const friendPagination = new Pagination(friendPages, 5 * 60 * 1000);
        await friendPagination.start(interaction);
        break;

      case 'view-friend-requests':
        if (client.pendingFriends.size === 0) {
          await interaction.editReply({
            embeds: [],
            components: [],
            content: 'You have no pending friends.',
          });
          return;
        }

        const friendReqPages: MessageEmbed[] = [];

        for (let i = 0; i < client.pendingFriends.size; i += 30) {
          const friendReqs = client.pendingFriends.toJSON().slice(i, i + 30);

          const page = new MessageEmbed()
            .setAuthor({
              name: `${epicAccount.displayName}'s Friend Requests`,
              iconURL: epicAccount.avatarUrl,
            })
            .setColor(bot._config.color)
            .setTimestamp()
            .setDescription('• * = Outgoing friend request')
            .setFooter({
              text: `Page ${i / 30 + 1} of ${Math.ceil(
                client.pendingFriends.size / 30,
              )} • ${client.pendingFriends.size} Friend Requests`,
            });

          for (let j = 0; j < friendReqs.length; j += 15) {
            const row = friendReqs.slice(j, j + 15);

            page.addField(
              `${i + j + 1} - ${i + j + row.length}`,
              row
                .map(
                  (f, idx) =>
                    `${i + j + 1 + idx}. ${f.displayName ?? `\`${f.id}\``}${
                      f.direction === 'OUTGOING' ? ' *' : ''
                    }`,
                )
                .join('\n'),
              true,
            );
          }

          friendReqPages.push(page);
        }

        const friendReqPagination = new Pagination(
          friendReqPages,
          5 * 60 * 1000,
        );
        await friendReqPagination.start(interaction);
        break;

      case 'clear-friends':
        await interaction.editReply({
          components: [confirmRow],
          embeds: [
            new MessageEmbed()
              .setAuthor({
                name: `${epicAccount.displayName}'s Friends`,
                iconURL: epicAccount.avatarUrl,
              })
              .setColor(bot._config.color)
              .setTimestamp()
              .setDescription(
                'Are you sure you want to clear your friend list?',
              ),
          ],
        });

        const confirmNukeFriends = await msg
          .awaitMessageComponent({
            filter: (i) => i.user.id === interaction.user.id,
            time: 60 * 1000,
          })
          .catch(() => null);

        if (!confirmNukeFriends || confirmNukeFriends.customId !== 'confirm') {
          await interaction.deleteReply();
          return;
        }

        await client.http.sendEpicgamesRequest(
          true,
          'DELETE',
          `https://friends-public-service-prod.ol.epicgames.com/friends/api/v1/${epicAccount.accountId}/friends`,
          'fortnite',
        );

        await interaction.editReply({
          components: [],
          embeds: [
            new MessageEmbed()
              .setAuthor({
                name: `${epicAccount.displayName}'s Friends`,
                iconURL: epicAccount.avatarUrl,
              })
              .setColor(bot._config.color)
              .setTimestamp()
              .setDescription('Your friend list has been cleared.'),
          ],
        });
        break;
    }
  },
};

export default Command;