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
import Emojis from '../../resources/Emojis';
import getLogger from '../../Logger';
import { handleCommandError } from '../../lib/Utils';

const Command: ICommand = {
  name: 'login',

  slashCommandBuilder: new SlashCommandBuilder()
    .setName('login')
    .setDescription('Login to Epic Games or switch between saved accounts.'),

  options: {},

  run: async (bot, interaction, user) => {
    const embed = new MessageEmbed()
      .setAuthor({
        name: `${interaction.user.username}'s Saved Accounts`,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
      })
      .setDescription(
        `To switch to a different account use the drop down menu below.
        To save a new account, click the **Save New Account** button below.
        This message will timeout in 60 seconds.`,
      )
      .setColor(bot._config.color);

    const isPremium =
      user.premiumUntil.getTime() > Date.now() || user.isPartner;
    const accountsLimit = isPremium ? 15 : 3;

    const saveNewAccountButton = new MessageButton()
      .setCustomId('saveNewAccount')
      .setLabel('Save New Account')
      .setDisabled(user.epicAccounts.length >= accountsLimit)
      .setEmoji('✨')
      .setStyle('SECONDARY');

    const closeButton = new MessageButton()
      .setCustomId('close')
      .setLabel('Close')
      .setEmoji(Emojis.cross)
      .setStyle('DANGER');

    const accountsMenu = new MessageSelectMenu()
      .setCustomId('accountsMenu')
      .setPlaceholder('Select an account')
      .setDisabled(user.epicAccounts.length === 0)
      .setOptions(
        user.epicAccounts.map((account: any) => ({
          value: account.accountId,
          label: account.displayName,
          description: account.accountId,
          default: user.selectedEpicAccount === account.accountId,
        })),
      );

    const components = [];

    if (user.epicAccounts.length > 0) {
      components.push(new MessageActionRow().addComponents(accountsMenu));
    }

    const btns = new MessageActionRow();
    btns.addComponents(saveNewAccountButton, closeButton);
    components.push(btns);

    await interaction.editReply({
      embeds: [embed],
      components,
    });

    const msg = (await interaction.fetchReply()) as Message;

    const selected = await msg
      .awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id,
        time: 60 * 1000,
      })
      .catch(() => null);

    if (!selected || selected.customId === 'close') {
      await interaction.deleteReply().catch(() => {});
      return;
    }

    if (selected.customId === 'saveNewAccount') {
      if (bot.loginCooldowns.has(interaction.user.id)) {
        const wait =
          (bot.loginCooldowns.get(interaction.user.id)! - Date.now()) / 1000;
        if (wait > 0) {
          await interaction.editReply({
            content: `You must wait ${
              (bot.loginCooldowns.get(interaction.user.id)! - Date.now()) / 1000
            }s before you can use login new command again.`,
            embeds: [],
            components: [],
            files: [],
          });
          return;
        }
      }

      const newAccountEmbed = new MessageEmbed()
        .setAuthor({
          name: `${interaction.user.username}'s Saved Accounts`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
        })
        .setColor(bot._config.color)
        .setTimestamp()
        .setImage('attachment://AuthCode.png')
        .setDescription(
          `**How to Login**
**• Step 1**: Click on the Epic Games button below or this [URL](https://www.epicgames.com/id/login?redirectUrl=https%3A%2F%2Fwww.epicgames.com%2Fid%2Fapi%2Fredirect%3FclientId%3D3446cd72694c4a4485d81b77adbb2141%26responseType%3Dcode).

**• Step 2**: Copy the 32 digit code next to "authorizationCode".
Example: **aabbccddeeff11223344556677889900**

**• Step 3**: Click on the Submit Code button below and submit your authorization code.

**• Step 4**: You are finished.

⚠️ We recommend that you only log into accounts that you have email access to.

**This message will timeout in 5 minutes.**`,
        );

      const authcodeImg = new MessageAttachment(
        './assets/AuthCode.png',
        'AuthCode.png',
      );

      const authcodeButton = new MessageButton()
        .setLabel('Epic Games')
        .setURL(
          'https://www.epicgames.com/id/login?redirectUrl=https%3A%2F%2Fwww.epicgames.com%2Fid%2Fapi%2Fredirect%3FclientId%3D3446cd72694c4a4485d81b77adbb2141%26responseType%3Dcode',
        )
        .setStyle('LINK');

      const submitcodeButton = new MessageButton()
        .setCustomId('submitcode')
        .setLabel('Submit Code (30s Cooldown)')
        .setStyle('SECONDARY');

      const authCodeModal = new Modal()
        .setCustomId('authCodeModal')
        .setTitle('Fishstick - Login');

      const authCodeInput = new TextInputComponent()
        .setCustomId('authCodeInput')
        .setLabel('Authorization Code')
        .setPlaceholder('Enter your 32 digit authorization code here.')
        .setMinLength(32)
        .setMaxLength(32)
        .setStyle('SHORT')
        .setRequired(true);

      authCodeModal.addComponents(
        new MessageActionRow<ModalActionRowComponent>().addComponents(
          authCodeInput,
        ),
      );

      const authcodeComponents = new MessageActionRow().addComponents(
        authcodeButton,
        submitcodeButton,
      );

      await interaction.editReply({
        embeds: [newAccountEmbed],
        components: [authcodeComponents],
        files: [authcodeImg],
      });

      const collector = msg.createMessageComponentCollector({
        filter: (i) => i.user.id === interaction.user.id,
        time: 5 * 60 * 1000,
      });
      bot.loginCooldowns.set(interaction.user.id, Date.now() + 5 * 60 * 1000);
      setTimeout(() => {
        bot.loginCooldowns.delete(interaction.user.id);
      }, 5 * 60 * 1000);

      collector.on('collect', async (i) => {
        try {
          if (i.customId === 'submitcode') {
            await i.showModal(authCodeModal);

            setTimeout(async () => {
              (i.component as MessageButton)
                .setLabel('Submit Code (30s Cooldown)')
                .setDisabled(false);
              return i
                .editReply({
                  components: i.message.components as any,
                })
                .catch(() => {});
            }, 30 * 1000);

            (i.component as MessageButton)
              .setLabel('On Cooldown...')
              .setDisabled(true);
            await i.editReply({
              components: i.message.components as any,
            });

            const modalSubmit = await i
              .awaitModalSubmit({
                filter: (int) => int.user.id === interaction.user.id,
                time: 30 * 1000,
              })
              .catch(() => null);
            if (!modalSubmit) return;

            await modalSubmit.deferReply({ ephemeral: true });

            const authorizationCode =
              modalSubmit.fields.getTextInputValue('authCodeInput');

            try {
              const loginacc =
                await bot.fortniteManager.clientFromAuthorizationCode(
                  authorizationCode,
                );

              let epicAcc = await bot.epicAccountModel
                .findOne({
                  accountId: loginacc.accountId,
                })
                .exec();

              if (epicAcc) {
                epicAcc.accountId = loginacc.accountId;
                epicAcc.deviceId = loginacc.deviceAuth.deviceId;
                epicAcc.secret = loginacc.deviceAuth.secret;
                epicAcc.displayName =
                  loginacc.displayName || loginacc.accountId;
                epicAcc.avatarUrl = loginacc.avatar;
                await epicAcc.save();
              } else {
                epicAcc = await bot.epicAccountModel.create({
                  accountId: loginacc.accountId,
                  deviceId: loginacc.deviceAuth.deviceId,
                  secret: loginacc.deviceAuth.secret,
                  displayName: loginacc.displayName || loginacc.accountId,
                  avatarUrl: loginacc.avatar,
                  autoDaily: true,
                  autoFreeLlamas: isPremium,
                  autoResearch: isPremium ? 'auto' : 'none',
                });
              }

              if (
                (user.epicAccounts as IEpicAccount[]).find(
                  (a) => a.accountId === loginacc.accountId,
                )
              ) {
                await modalSubmit.editReply(
                  `You already have this account logged in.`,
                );
                return;
              }

              user.selectedEpicAccount = epicAcc.accountId;
              user.epicAccounts.push(epicAcc._id as any);
              await user.save();

              await modalSubmit.editReply({
                embeds: [
                  new MessageEmbed()
                    .setAuthor({
                      name: `${interaction.user.username}'s Saved Accounts`,
                      iconURL: interaction.user.displayAvatarURL({
                        dynamic: true,
                      }),
                    })
                    .setColor('GREEN')
                    .setTimestamp()
                    .setThumbnail(epicAcc.avatarUrl)
                    .setDescription(
                      `${
                        Emojis.tick
                      } You have been successfully logged into **${
                        epicAcc.displayName
                      }**.
                    You are a ${
                      isPremium ? 'premium' : 'regular'
                    } member so I have enabled these perks by default.
                    • Automatic Daily Login Reward
                    ${
                      isPremium
                        ? `\n• Automatic Free Llamas\n• Automatic Research`
                        : ''
                    }`,
                    ),
                ],
              });

              bot.loginCooldowns.delete(interaction.user.id);
              collector.stop();
            } catch (e: any) {
              await modalSubmit
                .editReply({
                  content: `${e?.error?.errorMessage ?? e}`,
                })
                .catch(() => {});
            }
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
        if (reason === 'time') {
          await interaction.deleteReply().catch(() => {});
        }
      });

      return;
    }

    const selectedEpicAccount = (user.epicAccounts as IEpicAccount[]).find(
      (a) => a.accountId === (selected as SelectMenuInteraction).values[0],
    );

    if (!selectedEpicAccount) {
      throw new Error('Invalid Epic Account');
    }

    user.selectedEpicAccount = selectedEpicAccount.accountId;
    await user.save();

    const selectedEmbed = new MessageEmbed()
      .setAuthor({
        name: `${interaction.user.username}'s Saved Accounts`,
        iconURL: interaction.user.displayAvatarURL({
          dynamic: true,
        }),
      })
      .setColor(bot._config.color)
      .setTimestamp()
      .setThumbnail(selectedEpicAccount.avatarUrl)
      .setDescription(
        `${Emojis.tick} Successfully switched active epic account to **${selectedEpicAccount.displayName}**.`,
      );

    await interaction.editReply({
      embeds: [selectedEmbed],
      components: [],
    });
  },
};

export default Command;
