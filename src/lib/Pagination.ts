import {
  MessageEmbed,
  MessageButton,
  MessageActionRow,
  Message,
  CommandInteraction,
} from 'discord.js';

import Emojis from '../resources/Emojis';
import getLogger from '../Logger';
import { handleCommandError } from './Utils';

class Pagination {
  public timeLimit: number = 5 * 60 * 1000;
  public buttonsDisabled: boolean = false;

  public page: number;
  public pages: MessageEmbed[];

  public constructor(pages: MessageEmbed[], timeLimit?: number) {
    this.buttonsDisabled = false;

    this.page = 0;
    this.pages = pages;

    if (timeLimit) {
      this.timeLimit = timeLimit;
    }

    if (this.pages.length === 0) {
      throw new Error('No pages provided for Pagination.');
    }
  }

  public async start(interaction: CommandInteraction) {
    await interaction.editReply({
      embeds: [this.pages[this.page]],
      components: [this.buttons],
    });

    const msg = (await interaction.fetchReply()) as Message;

    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: this.timeLimit,
    });

    const moves: any = {
      back2: -2,
      back1: -1,
      next1: 1,
      next2: 2,
    };

    collector.on('collect', async (i) => {
      try {
        if (i.customId === 'close') {
          collector.stop();
          return;
        }

        const move = moves[i.customId];

        if (move) {
          this.page += move;

          if (this.page < 0) {
            this.page = 0;
          }
          if (this.page >= this.pages.length) {
            this.page = this.pages.length - 1;
          }

          await interaction.editReply({
            embeds: [this.pages[this.page]],
            components: [this.buttons],
          });
        }
      } catch (e) {
        await handleCommandError(getLogger('COMMAND'), interaction, e);
        collector.stop('handleError');
      }
    });

    collector.on('end', async (collected, reason) => {
      if (reason === 'handleError') return;

      this.buttonsDisabled = true;

      await interaction
        .editReply({
          components: [this.buttons],
        })
        .catch(() => {});
    });
  }

  private get buttons(): MessageActionRow {
    const row = new MessageActionRow();

    const back2 = new MessageButton()
      .setCustomId('back2')
      .setLabel('«')
      .setDisabled(this.page === 0 || this.buttonsDisabled)
      .setStyle('SECONDARY');

    const back1 = new MessageButton()
      .setCustomId('back1')
      .setLabel('‹')
      .setDisabled(this.page === 0 || this.buttonsDisabled)
      .setStyle('SECONDARY');

    const next1 = new MessageButton()
      .setCustomId('next1')
      .setLabel('›')
      .setDisabled(this.page === this.pages.length - 1 || this.buttonsDisabled)
      .setStyle('SECONDARY');

    const next2 = new MessageButton()
      .setCustomId('next2')
      .setLabel('»')
      .setDisabled(this.page === this.pages.length - 1 || this.buttonsDisabled)
      .setStyle('SECONDARY');

    const close = new MessageButton()
      .setCustomId('close')
      .setLabel('Close')
      .setEmoji(Emojis.cross)
      .setStyle('DANGER')
      .setDisabled(this.buttonsDisabled);

    row.addComponents(back2, back1, next1, next2, close);

    return row;
  }
}

export default Pagination;
