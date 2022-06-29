import { Interaction, Collection, MessageEmbed } from 'discord.js';
import { promisify } from 'util';

import type IEvent from '../../structures/Event';
import getLogger from '../../Logger';
import Emojies from '../../resources/Emojies';

const wait = promisify(setTimeout);
const logger = getLogger('COMMAND');

const Event: IEvent = {
  name: 'interactionCreate',
  run: async (bot, interaction: Interaction) => {
    if (interaction.isCommand()) {
      const cmd = bot.commands.get(interaction.commandName);
      if (!cmd) return;

      logger.info(`${interaction.user.tag} used command ${cmd.name}`);

      if (
        cmd.options.ownerOnly &&
        interaction.user.id !== bot._config.ownerDiscordID
      ) {
        await interaction.reply('You are not allowed to use this command.');
        return;
      }

      await interaction
        .deferReply({ ephemeral: cmd.options.privateResponse })
        .catch(() => {});

      let user = await bot.userModel
        .findOne({
          id: interaction.user.id,
        })
        .exec();

      if (!user) {
        user = await bot.userModel.create({
          id: interaction.user.id,
        });
      }

      if (user.blacklisted) {
        await interaction.editReply(
          `You are blacklisted from using this bot for ${
            user.blacklistedReason
              ? `reason: ${user.blacklistedReason}`
              : 'no reason'
          }`,
        );
        return;
      }

      if (cmd.options.partnerOnly && !user.isPartner) {
        await interaction.editReply(
          'You must be Fishstick Partner to use this command, for more information make a ticket in [our support server](https://discord.gg/fishstick)',
        );
        return;
      }

      const isPremium = user.premiumUntil.getTime() > Date.now();
      if (cmd.options.premiumOnly && !isPremium) {
        // TODO
      }

      if (!bot.cooldowns.has(cmd.name)) {
        bot.cooldowns.set(cmd.name, new Collection<string, number>());
      }

      const cooldown = bot.cooldowns.get(cmd.name)!;

      if (cooldown.has(interaction.user.id)) {
        const timeLeft =
          (cooldown.get(interaction.user.id)! - Date.now()) / 1000;
        await interaction.editReply(
          `You must wait ${timeLeft.toFixed(
            1,
          )} seconds before using this command again.`,
        );

        setTimeout(async () => {
          await interaction.deleteReply();
        }, timeLeft * 1000);
        return;
      }

      cooldown.set(
        interaction.user.id,
        Date.now() + (isPremium ? bot.cooldown / 2 : bot.cooldown) * 1000,
      );

      setTimeout(() => {
        cooldown.delete(interaction.user.id);
      }, (isPremium ? bot.cooldown / 2 : bot.cooldown) * 1000);

      try {
        await cmd.run(bot, interaction, user);
      } catch (e: any) {
        logger.error(e);

        const errorEmbed = new MessageEmbed()
          .setTitle(`${Emojies.cross} NOT THE LLAMA YOU'RE LOOKING FOR`)
          .setColor('RED')
          .setDescription(
            `An error occured while running the command ${cmd.name}.\n${e}\n\nIf this error persists, please report it in our [support server](https://discord.gg/fishstick).`,
          )
          .addField('Stack', `\`\`\`${e.stack ?? e}\`\`\``)
          .setTimestamp();

        await interaction
          .editReply({
            embeds: [errorEmbed],
            components: [],
          })
          .catch(() => {});
      }
    }

    if (interaction.isButton() || interaction.isSelectMenu()) {
      await wait(500);
      await interaction.deferUpdate().catch(() => {});
    }
  },
};

export default Event;
