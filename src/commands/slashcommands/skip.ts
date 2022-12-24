import { SlashCommandBuilder, SlashCommandNumberOption, SlashCommandStringOption } from 'discord.js';
import { musicQueueManager } from '../../music/musicQueueManager';
import { Command } from '../types';

export const skip: Command = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skips current track')
        .setDescriptionLocalizations({ ru: 'Пропускает текущий трек' })
        .addNumberOption(
            new SlashCommandNumberOption().setName('count').setRequired(false).setDescription('Number of skipped tracks').setDescriptionLocalizations({ ru: 'Количество пропускаемых треков' })
        )
        .toJSON(),
    execute: (interaction) => {
        const user = interaction.guild!.members.cache.get(interaction.user.id)!;
        const voiceChannel = user.voice.channel;
        if (!voiceChannel) {
            interaction.reply('You should be in a voice channel!');
            return;
        }
        let musicQueue = musicQueueManager.get(String(voiceChannel.id));
        if (!musicQueue) {
            interaction.reply('No tracks in queue');
            return;
        }
        musicQueue.setTextChannel(interaction.channel!);

        let count = Number(interaction.options.get('count')?.value) || 1;
        const skipedCount = musicQueue.skipTrack(count);
        interaction.reply(`Skipped ${skipedCount} track(s)`);
    },
};
