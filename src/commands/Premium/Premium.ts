/* eslint-disable no-param-reassign */
import { MessageEmbed } from 'discord.js';
import { SlashCommandBuilder, time } from '@discordjs/builders';

import type { ICommand } from '../../structures/Command';
import Emojis from '../../resources/Emojies';

const Command: ICommand = {
  name: 'premium',

  slashCommandBuilder: new SlashCommandBuilder()
    .setName('premium')
    .setDescription('Generate/redeem a premium key.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('generate')
        .setDescription('Generate a premium key.')
        .addStringOption((o) =>
          o
            .setName('plan')
            .setDescription('The plan to generate a premium key for.')
            .setRequired(true)
            .setChoices(
              {
                name: 'Weekly',
                value: 'weekly',
              },
              {
                name: 'Monthly',
                value: 'monthly',
              },
              {
                name: '6 Months',
                value: '6months',
              },
              {
                name: 'Yearly',
                value: 'yearly',
              },
              {
                name: 'Lifetime',
                value: '100years',
              },
            ),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('redeem')
        .setDescription('Redeem a premium key.')
        .addStringOption((o) =>
          o
            .setName('key')
            .setDescription('The key to redeem.')
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('revoke')
        .setDescription('Revoke premium status from a user.')
        .addUserOption((user) =>
          user
            .setName('user')
            .setDescription('The user to revoke premium status of.')
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('check')
        .setDescription('Check premium status of a user.')
        .addUserOption((user) =>
          user
            .setName('user')
            .setDescription('The user to check premium status of.')
            .setRequired(true),
        ),
    ),

  options: {},

  run: async (bot, interaction, user) => {
    const subcommand = interaction.options.getSubcommand();
    const plan = interaction.options.getString('plan');
    const keyInput = interaction.options.getString('key');
    const target = interaction.options.getUser('user');

    const planDays: any = {
      weekly: 7,
      monthly: 30,
      '6months': 180,
      yearly: 365,
      '100years': 365 * 100,
    };

    let key: any;
    let keyDoc: any;
    let targetUser: any;
    let isPremium: any;
    switch (subcommand) {
      case 'generate':
        if (!user.isPartner) {
          await interaction.editReply(
            `${Emojis.cross} You are not a partner, you cannot generate a premium key.`,
          );
          return;
        }

        if (
          !plan ||
          !['weekly', 'monthly', '6months', 'yearly', '100years'].includes(plan)
        ) {
          await interaction.editReply(
            `${Emojis.cross} Please specify a valid plan.`,
          );
          return;
        }

        key = await bot.premiumKeyModel.create({
          code: `${Math.random().toString(36).substring(2, 6)}-${Math.random()
            .toString(36)
            .substring(2, 6)}-${Math.random()
            .toString(36)
            .substring(2, 6)}-${Math.random()
            .toString(36)
            .substring(2, 6)}`.toUpperCase(),
          premiumDays: planDays[plan as any],

          createdBy: user._id,
        });

        await interaction.editReply({
          embeds: [
            new MessageEmbed()
              .setAuthor({
                name: `Premium Key Generated`,
              })
              .setColor(bot._config.color)
              .setTimestamp()
              .setDescription(
                `**Code:** ${key.code}
                **Duration:** ${key.premiumDays} days`,
              ),
          ],
        });
        break;

      case 'redeem':
        if (!keyInput) {
          await interaction.editReply(
            `${Emojis.cross} Please specify a valid key.`,
          );
          return;
        }

        keyDoc = await bot.premiumKeyModel.findOne({ code: keyInput! }).exec();
        if (!keyDoc) {
          await interaction.editReply(
            `${Emojis.cross} Please specify a valid key.`,
          );
          return;
        }

        if (keyDoc.redeemedBy) {
          await interaction.editReply(
            `${Emojis.cross} This key has already been redeemed.`,
          );
          return;
        }

        isPremium = user.premiumUntil.getTime() > Date.now() || user.isPartner;

        if (user.isPartner) {
          await interaction.editReply(
            `${Emojis.cross} You are already a partner, you cannot redeem a premium key.`,
          );
          return;
        }

        if (!isPremium) {
          user.premiumUntil = new Date(
            Date.now() + keyDoc.premiumDays * 24 * 60 * 60 * 1000,
          );
        } else {
          user.premiumUntil = new Date(
            user.premiumUntil.getTime() +
              keyDoc.premiumDays * 24 * 60 * 60 * 1000,
          );
        }

        await user.save();

        keyDoc.redeemedBy = user._id;
        keyDoc.redeemedAt = new Date();

        await keyDoc.save();

        await interaction.editReply({
          embeds: [
            new MessageEmbed()
              .setAuthor({
                name: `${interaction.user.username}'s Premium Status`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
              })
              .setColor(bot._config.color)
              .setTimestamp()
              .setDescription(
                `${
                  Emojis.tick
                } Successfully redeemed a premium key for duration of ${
                  keyDoc.premiumDays
                } days. Now you have premium status until ${time(
                  user.premiumUntil,
                )}`,
              ),
          ],
        });
        break;

      case 'revoke':
        if (!user.isPartner) {
          await interaction.editReply(
            `${Emojis.cross} You are not a partner, you cannot revoke premium status.`,
          );
          return;
        }

        targetUser = await bot.userModel
          .findOne({
            id: target!.id,
          })
          .exec();

        if (!targetUser) {
          await interaction.editReply(
            `${Emojis.cross} ${target!.tag} not found in database.`,
          );
          return;
        }

        isPremium =
          targetUser.premiumUntil.getTime() > Date.now() || user.isPartner;

        if (!isPremium) {
          await interaction.editReply(
            `${Emojis.cross} ${target!.tag} is not premium.`,
          );
          return;
        }

        if (targetUser.isPartner) {
          await interaction.editReply(
            `${Emojis.cross} ${target!.tag} is a partner.`,
          );
          return;
        }

        targetUser.premiumUntil = new Date(2000, 1, 1);
        await targetUser.save();

        await interaction.editReply({
          embeds: [
            new MessageEmbed()
              .setAuthor({
                name: `${target!.username}'s Premium Status`,
                iconURL: target!.displayAvatarURL({ dynamic: true }),
              })
              .setColor(bot._config.color)
              .setTimestamp()
              .setDescription(`Revoked premium status from **${target!.tag}**`),
          ],
        });
        break;

      case 'check':
        targetUser = await bot.userModel
          .findOne({
            id: target!.id,
          })
          .exec();

        if (!targetUser) {
          await interaction.editReply(
            `${Emojis.cross} ${target!.tag} not found in database.`,
          );
          return;
        }

        isPremium =
          targetUser.premiumUntil.getTime() > Date.now() || user.isPartner;

        if (!isPremium) {
          await interaction.editReply(
            `${Emojis.cross} ${target!.tag} is not premium.`,
          );
        }

        if (targetUser.isPartner) {
          await interaction.editReply(
            `${Emojis.cross} ${target!.tag} is a partner.`,
          );
          return;
        }

        await interaction.editReply({
          embeds: [
            new MessageEmbed()
              .setAuthor({
                name: `${target!.username}'s Premium Status`,
                iconURL: target!.displayAvatarURL({ dynamic: true }),
              })
              .setColor(bot._config.color)
              .setTimestamp()
              .setDescription(
                `${target!.tag} has premium until ${time(
                  targetUser.premiumUntil,
                )}`,
              ),
          ],
        });
        break;
    }
  },
};

export default Command;
