import { createAudioPlayer } from '@discordjs/voice';
import { Message } from 'discord.js';
import fetch from 'node-fetch';
import { Adapter } from './adapter';
import { Command } from './handler';
import { MusicQueue } from './music/musicQueue';
import { MusicQueueManager } from './music/musicQueueManager';
import { YT_API_KEY } from './config'

const adapter = new Adapter();
const musicQueueManager = new MusicQueueManager();

const commands: Command[] = [
    new Command('play', async (argsString: string, message: Message) => {
        const tracks: string[] = await adapter.parse(argsString);
        
        if(tracks.length > 300) {
            message.channel.send('Playlist is too long');
        }
        if(!message.guild) {
            return;
        }
        const user = message.guild.members.cache.get(message.author.id)!;
        const voiceChannel = user.voice.channel;
        if(!voiceChannel) {
            message.channel.send('You should be in a voice channel!');
            return;
        }
        let musicQueue = musicQueueManager.get(String(voiceChannel.id));
        if(!musicQueue) {
            musicQueue = musicQueueManager.set(String(voiceChannel.id), new MusicQueue(voiceChannel))
        }
        for (const track of tracks) {
            const youtubeSearchResult = await (await fetch(`https://www.googleapis.com/youtube/v3/search?part=id&key=${YT_API_KEY}&q=${encodeURI(track)}`)).json();
            if(!youtubeSearchResult) continue;
            const videoId = youtubeSearchResult?.items[0]?.id?.videoId;
            if(!videoId) continue;
            musicQueue?.enqueue(videoId);
            break;
        }

        const player = createAudioPlayer();
    })
];

export { commands };
