import { SlashCommandBuilder } from 'discord.js';
import { musicQueueManager } from '../../music/musicQueueManager';
import { Command } from '../types';

export const norepeat: Command = {
    data: new SlashCommandBuilder().setName('norepeat').setDescription('Cancels track replay').setDescriptionLocalizations({ ru: 'Отменяет повтор трека' }).toJSON(),
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
        musicQueue.cancelRepeating();
        interaction.reply('Replay canceled');
    },
};
