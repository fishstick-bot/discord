import {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
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
  public pages: EmbedBuilder[];

  public constructor(pages: EmbedBuilder[], timeLimit?: number) {
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

    const moves: {
      [key: string]: number;
    } = {
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
        await handleCommandError(
          undefined,
          undefined,
          getLogger('COMMAND'),
          interaction,
          e,
        );
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

  private get buttons(): ActionRowBuilder<ButtonBuilder> {
    const row = new ActionRowBuilder<ButtonBuilder>();

    const back2 = new ButtonBuilder()
      .setCustomId('back2')
      .setLabel('«')
      .setDisabled(this.page === 0 || this.buttonsDisabled)
      .setStyle(ButtonStyle.Secondary);

    const back1 = new ButtonBuilder()
      .setCustomId('back1')
      .setLabel('‹')
      .setDisabled(this.page === 0 || this.buttonsDisabled)
      .setStyle(ButtonStyle.Secondary);

    const next1 = new ButtonBuilder()
      .setCustomId('next1')
      .setLabel('›')
      .setDisabled(this.page === this.pages.length - 1 || this.buttonsDisabled)
      .setStyle(ButtonStyle.Secondary);

    const next2 = new ButtonBuilder()
      .setCustomId('next2')
      .setLabel('»')
      .setDisabled(this.page === this.pages.length - 1 || this.buttonsDisabled)
      .setStyle(ButtonStyle.Secondary);

    const close = new ButtonBuilder()
      .setCustomId('close')
      .setLabel('Close')
      .setEmoji(Emojis.cross)
      .setStyle(ButtonStyle.Danger)
      .setDisabled(this.buttonsDisabled);

    row.addComponents(back2, back1, next1, next2, close);

    return row;
  }
}

export default Pagination;
