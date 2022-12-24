import { SlashCommandBuilder } from 'discord.js';
import { musicQueueManager } from '../../music/musicQueueManager';
import { Command } from '../types';

export const pause: Command = {
    data: new SlashCommandBuilder().setName('pause').setDescription('Pauses playback').setDescriptionLocalizations({ ru: 'Приостанавливает воспроизведение' }).toJSON(),
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

        if (musicQueue.pause()) {
            interaction.reply('Playback paused');
            return;
        }
        interaction.reply('An error occured');
    },
};
