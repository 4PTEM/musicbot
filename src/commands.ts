import { Message, Permissions } from 'discord.js';
import fetch from 'node-fetch';
import { Adapter } from './adapter';
import { client } from './client';
import { Command } from './handler';
import { MusicQueue } from './music/musicQueue';
import { MusicQueueManager } from './music/musicQueueManager';

const adapter = new Adapter();
const musicQueueManager = new MusicQueueManager();
const API_KEYS = process.env.API_KEYS?.split(' ');
const CURRENT_KEY_INDEX = 0
function refreshApiKey() {
    if (!API_KEYS) {
        console.log('[ERROR] no api keys provided');
        return;
    }
    process.env.API_KEY = API_KEYS[CURRENT_KEY_INDEX + 1 % API_KEYS.length];
}

const commands: Command[] = [
    new Command('play', async (argsString: string, message: Message) => {
        const tracks: string[] = await adapter.parse(argsString);

        if (tracks.length > 30) {
            message.channel.send('Playlist is too long');
        }
        if (!message.guild) {
            return;
        }
        const user = message.guild.members.cache.get(message.author.id)!;
        const voiceChannel = user.voice.channel;
        if (!voiceChannel) {
            message.channel.send('You should be in a voice channel!');
            return;
        }
        let musicQueue = musicQueueManager.get(String(voiceChannel.id));
        if (!musicQueue) {
            musicQueue = musicQueueManager.set(String(voiceChannel.id), new MusicQueue(voiceChannel))
        }

        for (const track of tracks) {
            const queryParams = `part=id&maxResults=1&q=${encodeURI(track)}&key=${process.env.API_KEY}`;
            let youtubeSearchResult;
            try {
                youtubeSearchResult = await (await fetch(`https://www.googleapis.com/youtube/v3/search?${queryParams}`)).json();
            } catch (e) {
                refreshApiKey()
                youtubeSearchResult = await (await fetch(`https://www.googleapis.com/youtube/v3/search?${queryParams}`)).json();
            }

            if (!youtubeSearchResult) continue;
            const videoId = youtubeSearchResult?.items[0]?.id?.videoId;
            if (!videoId) continue;
            musicQueue?.enqueue(videoId);
        }
    }),
    new Command('kick', async (argsString, message) => {
        const { guild, author, mentions } = message;

        if (!guild) {
            message.channel.send('Command availible only in guilds');
            return;
        }

        const clientUser = guild.members.cache.get(client.user!.id)!;

        const usersToKick = mentions.members;
        if (!usersToKick) {
            message.channel.send('Please mention the users you want to kick out');
            return;
        }

        const user = guild.members.cache.get(author.id)!;
        if (!user.permissions.has(Permissions.FLAGS.KICK_MEMBERS)) {
            message.channel.send(`You have no permissions`);
            return;
        }

        for (const [id, kickableUser] of usersToKick) {
            if (!kickableUser.kickable) {
                message.channel.send(`User ${kickableUser.nickname || kickableUser.user.username} cannot be kicked`);
                continue;
            }
            guild.members.kick(kickableUser);
            message.channel.send(`${kickableUser.nickname || kickableUser.user.username} has been kicked from ${guild.name}`);
        }
    }),
    new Command('rm_messages', async (argsString, message) => {
        const { channel } = message;
        const mesages = await channel.messages.fetch();
        const offsetRegex = /offset\=([0-9]*)/;
        const countRegex = /count\=([0-9]*)/;
        let count = 1;
        let offset = 0;
        if (offsetRegex.test(argsString)) offset = Number([...argsString.match(offsetRegex)!][1])
        if (countRegex.test(argsString)) count = Number([...argsString.match(countRegex)!][1])

        if (offset + count > mesages.size) count = mesages.size - offset;
        for (let i = offset; i < count; i++) {
            channel.messages.delete(mesages.at(i)!)
        }
    }),
];

export { commands };

