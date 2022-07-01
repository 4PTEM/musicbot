import { Adapter, adapters } from './adapter';
import { MAX_PLAYLIST_LENGTH } from './constants';
import { Command } from './handler';
import { MusicQueue } from './music/musicQueue';
import { MusicQueueManager } from './music/musicQueueManager';
import { BaseTrack, YoutubeTrack } from './music/track';

const adapter = new Adapter(adapters);
const musicQueueManager = new MusicQueueManager();

const commands: Command[] = [
    new Command(
        'play',
        {
            default: 'Adds track to a queue',
            localizations: {
                'ru': 'Добавляет трек в очередь'
            }
        },
        [
            {
                name: 'query', type: 'STRING', required: true, description: {
                    default: 'Search query or url to a playlist/track/album on of supported music platforms',
                    localizations: {
                        'ru': 'Поисковой запрос или ссылка на плейлист/трек/альбом на одной из поддерживаемых музыкальных платформ'
                    }
                }
            }
        ],
        async (options, interaction) => {
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
                musicQueue = musicQueueManager.set(String(voiceChannel.id), new MusicQueue(voiceChannel, interaction.channel!));
            }
            musicQueue.setTextChannel(interaction.channel!);

            for (const track of tracks) {
                musicQueue.enqueue(track);
            }
            interaction.reply(`Enqueued ${tracks.length} tracks`);
        }
    ),
    new Command(
        'skip',
        {
            default: 'Skips current track',
            localizations: {
                'ru': 'Пропускает текущий трек'
            }
        },
        [
            {
                name: 'count', type: 'NUMBER', required: true, description: {
                    default: 'Number of skipped tracks',
                    localizations: {
                        'ru': 'Количество пропускаемых треков'
                    }
                }
            }
        ],
        (options, interaction) => {
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

            let count = Number(options.get('count')?.value) || 1;
            const skippedTracksList = musicQueue.skipTrack(count);
            interaction.reply(`Skipped tracks: \n${skippedTracksList}`);
        }
    ),
    new Command(
        'repeat_current',
        {
            default: 'Turns on repeat of the current track',
            localizations: {
                'ru': 'Включает повтор текущего трека'
            }
        },
        [],
        async (options, interaction) => {
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
        }),
    new Command(
        'norepeat',
        {
            default: 'Cancels track replay',
            localizations: {
                'ru': 'Отменяет повтор трека'
            }
        },
        [],
        async (options, interaction) => {
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
    new Command(
        'stop',
        {
            default: 'Stops playback',
            localizations: {
                'ru': 'Останавливает воспроизведение'
            }
        },
        [],
        async (options, interaction) => {
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
        {
            default: 'Removes message(s) (one message by default)',
            localizations: {
                'ru': 'Удаляет сообщениe(я) (по умолчанию одно сообщение)'
            }
        },
        [
            {
                name: 'count', type: 'INTEGER', required: false, description:
                {
                    default: 'Number of removed messages',
                    localizations: { 'ru': 'Количество удаляемых сообщений' }
                },
            },
            {
                name: 'offset', type: 'INTEGER', required: false, description: {
                    default: 'Offset from last message in channel',
                    localizations: {
                        'ru': 'Отступ от последнего сообщения в голосовом канале'
                    }
                },
            }
        ],
        async (options, interaction) => {
            if (!interaction.channel) return;
            const { channel } = interaction;
            const messages = await channel.messages.fetch();
            let count = Number(options.get('count')?.value) || 1;
            let offset = Number(options.get('offset')?.value) || 0;
            if (offset + count > messages.size) count = messages.size - offset;
            for (let i = offset; i < count + offset; i++) {
                channel.messages.delete(messages.at(i)!).catch((error) => {
                    console.log(`(RM_MESSAGES)[Error] Falied to delete message. ${error.message}`);
                });
            }
            interaction.reply(`Deleted ${count} message(s) after ${offset} message from the last one`);
        }
    ),
    new Command(
        'shpingalop',
        {
            default: 'Lopaet  shpingaleti',
            localizations: {
                'ru': 'Лопает шпингалеты'
            }
        },
        [],
        async (options, interaction) => {
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
            musicQueue.enqueue(new YoutubeTrack('https://www.youtube.com/watch?v=WcWnhK9-S7M'));
            interaction.reply('Шпингалеты лопнули');
        }
    )
];

export { commands };
