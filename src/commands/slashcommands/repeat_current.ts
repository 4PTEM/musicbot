import { SlashCommandBuilder } from 'discord.js';
import { musicQueueManager } from '../../music/musicQueueManager';
import { Command } from '../types';

export const repeat_current: Command = {
    data: new SlashCommandBuilder().setName('repeat_current').setDescription('Turns on repeat of the current track').setDescriptionLocalizations({ ru: 'Включает повтор текущего трека' }).toJSON(),
    execute: async (interaction) => {
        const user = interaction.guild!.members.cache.get(interaction.user.id)!;
        const voiceChannel = user.voice.channel;
        if (!voiceChannel) {
            interaction.reply('You should be in a voice channel!');
            return;
        }
        let musicQueue = musicQueueManager.get(String(voiceChannel.id));
        if (!musicQueue) {
            return;
        }
        musicQueue.setTextChannel(interaction.channel!);
        musicQueue.repeatCurrentTrack();
        interaction.reply('Current track will be replayed');
    },
};
