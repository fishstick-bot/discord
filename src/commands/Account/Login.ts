import {
  MessageEmbed,
  MessageButton,
  MessageSelectMenu,
  MessageActionRow,
  Message,
  MessageAttachment,
} from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

import type { ICommand } from '../../structures/Command';
import Emojis from '../../resources/Emojies';

const Command: ICommand = {
  name: 'login',
  category: 'account',

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
        'To switch to a different account use the drop down menu below.\nTo save a new account, click the **Save New Account** button below.\nThis message will timeout in 60 seconds.'
      )
      .setColor(bot._config.color);

    const saveNewAccountButton = new MessageButton()
      .setCustomId('saveNewAccount')
      .setLabel('Save New Account')
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
        }))
      );

    const components = new MessageActionRow();

    if (user.epicAccounts.length > 0) {
      components.addComponents(accountsMenu);
    }

    components.addComponents(saveNewAccountButton).addComponents(closeButton);

    await interaction.editReply({
      embeds: [embed],
      components: [components],
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
          
          **This message will timeout in 5 minutes.**`
        );

      const authcodeImg = new MessageAttachment(
        './assets/AuthCode.png',
        'AuthCode.png'
      );

      const authcodeButton = new MessageButton()
        .setLabel('Epic Games')
        .setURL(
          'https://www.epicgames.com/id/login?redirectUrl=https%3A%2F%2Fwww.epicgames.com%2Fid%2Fapi%2Fredirect%3FclientId%3D3446cd72694c4a4485d81b77adbb2141%26responseType%3Dcode'
        )
        .setStyle('LINK');

      const authcodeComponents = new MessageActionRow().addComponents(
        authcodeButton
      );

      await interaction.editReply({
        embeds: [newAccountEmbed],
        components: [authcodeComponents],
        files: [authcodeImg],
      });
    }

    // TODO: handle account switch
  },
};

export default Command;
