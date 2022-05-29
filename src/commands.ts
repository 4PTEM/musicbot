import { Adapter, adapters } from './adapter';
import { MAX_PLAYLIST_LENGTH } from './constants';
import { Command } from './handler';
import { MusicQueue } from './music/musicQueue';
import { MusicQueueManager } from './music/musicQueueManager';
import { BaseTrack } from './music/track';

const adapter = new Adapter(adapters);
const musicQueueManager = new MusicQueueManager();

const commands: Command[] = [
    new Command('play', 'Adds track to a queue', [{ name: 'query', type: 'string', required: true }], async (options, interaction) => {
        if (!interaction.channel) return;

        const tracks: BaseTrack[] = await adapter.parse(options.get('query')!.value as string);
        if (tracks.length > MAX_PLAYLIST_LENGTH) {
            interaction.channel.send('Playlist is too long');
            return;
        }
        const user = interaction.guild!.members.cache.get(interaction.user.id)!;
        const voiceChannel = user.voice.channel;
        if (!voiceChannel) {
            interaction.channel.send('You should be in a voice channel!');
            return;
        }
        let musicQueue = musicQueueManager.get(String(voiceChannel.id));
        if (!musicQueue) {
            musicQueue = musicQueueManager.set(String(voiceChannel.id), new MusicQueue(voiceChannel));
        }

        for (const track of tracks) {
            musicQueue.enqueue(track);
        }
    }),
    new Command('skip', 'Skips current track', [{ name: 'count', type: 'integer', required: false }], (options, interaction) => {
        if (!interaction.channel) return;
        const user = interaction.guild!.members.cache.get(interaction.user.id)!;
        const voiceChannel = user.voice.channel;
        if (!voiceChannel) {
            interaction.channel.send('You should be in a voice channel!');
            return;
        }
        let musicQueue = musicQueueManager.get(String(voiceChannel.id));
        if (!musicQueue) {
            return;
        }

        let count = Number(options.get('count')?.value) || 1;
        musicQueue.skipTrack(count);
    }),
    new Command('repeat_current', 'Repeats current track', [], async (options, interaction) => {
        if (!interaction.channel) return;
        const user = interaction.guild!.members.cache.get(interaction.user.id)!;
        const voiceChannel = user.voice.channel;
        if (!voiceChannel) {
            interaction.channel.send('You should be in a voice channel!');
            return;
        }
        let musicQueue = musicQueueManager.get(String(voiceChannel.id));
        if (!musicQueue) {
            return;
        }
        musicQueue.repeatCurrentTrack();
    }),
    new Command('norepeat', 'Cancels track replay', [], async (options, interaction) => {
        if (!interaction.channel) return;
        const user = interaction.guild!.members.cache.get(interaction.user.id)!;
        const voiceChannel = user.voice.channel;
        if (!voiceChannel) {
            interaction.channel.send('You should be in a voice channel!');
            return;
        }
        let musicQueue = musicQueueManager.get(String(voiceChannel.id));
        if (!musicQueue) {
            return;
        }
        musicQueue.cancelRepeating();
    }),
    new Command('stop', 'Stops playing all tracks', [], async (options, interaction) => {
        if (!interaction.channel) return;
        const user = interaction.guild!.members.cache.get(interaction.user.id)!;
        const voiceChannel = user.voice.channel;
        if (!voiceChannel) {
            interaction.channel.send('You should be in a voice channel!');
            return;
        }
        let musicQueue = musicQueueManager.get(String(voiceChannel.id));
        if (!musicQueue) {
            interaction.channel.send('No tracks');
            return;
        }

        musicQueue.stop();
    }),
    new Command(
        'rm_messages',
        'Removes messages',
        [
            { name: 'count', type: 'integer', required: false },
            { name: 'offset', type: 'integer', required: false },
        ],
        async (options, interaction) => {
            if (!interaction.channel) return;
            const { channel } = interaction;
            const messages = await channel.messages.fetch();
            let count = Number(options.get('count')?.value) || 1;
            let offset = Number(options.get('offset')?.value) || 0;
            if (offset + count > messages.size) count = messages.size - offset;
            for (let i = offset; i < count + offset; i++) {
                await channel.messages.delete(messages.at(i)!);
            }
        }
    ),
];

export { commands };

