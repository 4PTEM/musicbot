import { SlashCommandBuilder, SlashCommandIntegerOption } from 'discord.js';
import { Command } from '../types';

export const rm_messages: Command = {
    data: new SlashCommandBuilder()
        .setName('rm_messages')
        .setDescription('Removes message(s) (one message by default)')
        .setDescriptionLocalizations({ ru: 'Удаляет сообщениe(я) (по умолчанию одно сообщение)' })
        .addIntegerOption(
            new SlashCommandIntegerOption().setName('count').setRequired(false).setDescription('Number of removed messages').setDescriptionLocalizations({ ru: 'Количество удаляемых сообщений' })
        )
        .addIntegerOption(
            new SlashCommandIntegerOption()
                .setName('offset')
                .setRequired(false)
                .setDescription('Offset from last message in channel')
                .setDescriptionLocalizations({ ru: 'Отступ от последнего сообщения в голосовом канале' })
        )
        .toJSON(),
    execute: async (interaction) => {
        if (!interaction.channel) return;
        const { channel } = interaction;
        const messages = await channel.messages.fetch();
        let count = Number(interaction.options.get('count')?.value) || 1;
        let offset = Number(interaction.options.get('offset')?.value) || 0;
        if (offset + count > messages.size) count = messages.size - offset;
        interaction.reply(`Deleting ${count} message(s) after ${offset} message from the last one...\n(it can take a minute)`);
        for (let i = offset; i < count + offset; i++) {
            try {
                await channel.messages.delete(messages.at(i)!);
            } catch (e) {
                channel.send('No permission for message managing');
                break;
            }
        }
    },
};
