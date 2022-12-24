import { CommandInteraction, SlashCommandBuilder, SlashCommandStringOption } from 'discord.js';
import { adapter } from '../../adapter';
import { MAX_PLAYLIST_LENGTH } from '../../constants';
import { MusicQueue } from '../../music/musicQueue';
import { musicQueueManager } from '../../music/musicQueueManager';
import { BaseTrack } from '../../music/track';
import { Command } from '../types';

export const play: Command = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Adds track to a queue')
        .setDescriptionLocalizations({ ru: 'Добавляет трек в очередь' })
        .addStringOption(
            new SlashCommandStringOption()
                .setName('query')
                .setRequired(true)
                .setDescription('Search query or url to a playlist/track/album on of supported music platforms')
                .setDescriptionLocalizations({ ru: 'Поисковой запрос или ссылка на плейлист/трек/альбом на одной из поддерживаемых музыкальных платформ' })
        )
        .toJSON(),
    execute: async (interaction: CommandInteraction<'cached' | 'raw'>) => {
        const tracks: BaseTrack[] = await adapter.parse(interaction.options.get('query')!.value as string);
        if (tracks.length > MAX_PLAYLIST_LENGTH) {
            interaction.reply('Playlist is too long');
            return;
        }
        const user = interaction.guild!.members.cache.get(interaction.user.id)!;
        const voiceChannel = user.voice.channel;
        if (!voiceChannel) {
            interaction.reply('You should be in a voice channel!');
            return;
        }

        let musicQueue = musicQueueManager.get(String(voiceChannel.id));
        if (!musicQueue) {
            musicQueue = musicQueueManager.set(String(voiceChannel.id), new MusicQueue(voiceChannel, interaction.channel!));
        }
        musicQueue.setTextChannel(interaction.channel!);

        for (const track of tracks) {
            musicQueue.enqueue(track);
        }
        interaction.reply(`Enqueued ${tracks.length} tracks`);
    },
};
