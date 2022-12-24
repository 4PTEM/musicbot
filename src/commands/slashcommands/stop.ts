import { SlashCommandBuilder } from 'discord.js';
import { musicQueueManager } from '../../music/musicQueueManager';
import { Command } from '../types';

export const stop: Command = {
    data: new SlashCommandBuilder().setName('stop').setDescription('Stops playback and clears queue').setDescriptionLocalizations({ ru: 'Останавливает воспроизведение и очищает очередь' }).toJSON(),
    execute: async (interaction) => {
        const user = interaction.guild!.members.cache.get(interaction.user.id)!;
        const voiceChannel = user.voice.channel;
        if (!voiceChannel) {
            interaction.reply('You should be in a voice channel!');
            return;
        }
        let musicQueue = musicQueueManager.get(String(voiceChannel.id));
        if (!musicQueue) {
            interaction.reply('No tracks');
            return;
        }

        musicQueue.stop();
        interaction.reply('Playback stopped');
    },
};
