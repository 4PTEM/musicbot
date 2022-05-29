import { Adapter, adapters } from './adapter';
import { MAX_PLAYLIST_LENGTH } from './constants';
import { Command } from './handler';
import { MusicQueue } from './music/musicQueue';
import { MusicQueueManager } from './music/musicQueueManager';
import { BaseTrack } from './music/track';

const adapter = new Adapter(adapters);
const musicQueueManager = new MusicQueueManager();

const commands: Command[] = [
    new Command('play', 'Adds track to a queue', [{ name: 'query', type: 'string', required: true, description: 'search query or url to on of supported music platforms' }], async (options, interaction) => {
        const tracks: BaseTrack[] = await adapter.parse(options.get('query')!.value as string);
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
            musicQueue = musicQueueManager.set(String(voiceChannel.id), new MusicQueue(voiceChannel));
        }

        for (const track of tracks) {
            musicQueue.enqueue(track);
        }
        interaction.reply(`Enqueued ${tracks.length} tracks`);
    }),
    new Command('skip', 'Skips current track', [{ name: 'count', type: 'integer', required: false, description: 'Number of skipped tracks' }], (options, interaction) => {
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

        let count = Number(options.get('count')?.value) || 1;
        musicQueue.skipTrack(count);
        interaction.reply('Track skipped');
    }),
    new Command('repeat_current', 'Repeats current track', [], async (options, interaction) => {
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
        musicQueue.repeatCurrentTrack();
        interaction.reply('Current track will be replayed');
    }),
    new Command('norepeat', 'Cancels track replay', [], async (options, interaction) => {
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
    }),
    new Command('stop', 'Stops playing all tracks', [], async (options, interaction) => {
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
    }),
    new Command(
        'rm_messages',
        'Removes messages',
        [
            { name: 'count', type: 'integer', required: false, description: 'Number of removed messages' },
            { name: 'offset', type: 'integer', required: false, description: 'Offset from last message in channel' },
        ],
        async (options, interaction) => {
            if (!interaction.channel) return;
            const { channel } = interaction;
            const messages = await channel.messages.fetch();
            let count = Number(options.get('count')?.value) || 1;
            let offset = Number(options.get('offset')?.value) || 0;
            if (offset + count > messages.size) count = messages.size - offset;
            for (let i = offset; i < count + offset; i++) {
                channel.messages.delete(messages.at(i)!);
            }
            interaction.reply(`Deleted ${count} message(s) after ${offset} message from the last one`);
        }
    ),
];

export { commands };
