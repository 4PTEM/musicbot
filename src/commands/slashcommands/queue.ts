import { SlashCommandBuilder } from 'discord.js';
import { musicQueueManager } from '../../music/musicQueueManager';
import { Command } from '../types';

export const queue: Command = {
    data: new SlashCommandBuilder().setName('queue').setDescription('Shows enqueued tracks').setDescriptionLocalizations({ ru: 'Показывает очередь треков' }).toJSON(),
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

        interaction.reply(musicQueue.getTracksList());
    },
};
