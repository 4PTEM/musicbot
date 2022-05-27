import { Message, Permissions } from 'discord.js';
import { Adapter } from './adapter';
import { Command } from './handler';
import { MusicQueue } from './music/musicQueue';
import { MusicQueueManager } from './music/musicQueueManager';

const adapter = new Adapter();
const musicQueueManager = new MusicQueueManager();

const commands: Command[] = [
    new Command('play', async (argsString: string, message: Message) => {
        const tracks: string[] = await adapter.parse(argsString);

        if (tracks.length > 100) {
            message.channel.send('Playlist is too long');
            return;
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
            musicQueue.enqueue(track);
        }
    }),
    new Command('skip', (argsString: string, message: Message) => {
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

        let count = 1;
        if (!isNaN(Number(argsString))) count = Number(argsString);
        musicQueue.skipTrack(count);
    }),
    new Command('stop', async (argsString: string, message: Message) => {
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
            message.channel.send('No tracks')
            return;
        }

        musicQueue.stop();
    }),
    new Command('kick', async (argsString, message) => {
        const { guild, author, mentions } = message;

        if (!guild) {
            message.channel.send('Command availible only in guilds');
            return;
        }

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
        const messages = await channel.messages.fetch();
        const args = argsString.split(' ');
        let count = Number(args[0]) || 1;
        let offset = Number(args[1]) || 0;
        if (offset + count > messages.size) count = messages.size - offset;
        for (let i = offset; i < count + offset; i++) {
            await channel.messages.delete(messages.at(i)!)
        }
    }),
    new Command('repeat_message', async (argsString, message) => {
        const { channel } = message;
        channel.send(' ')
    })
];

export { commands };

