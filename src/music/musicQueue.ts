import {
    AudioPlayer,
    AudioPlayerStatus,
    createAudioPlayer,
    entersState,
    joinVoiceChannel,
    NoSubscriberBehavior,
    VoiceConnection,
    VoiceConnectionDisconnectReason,
    VoiceConnectionStatus,
} from '@discordjs/voice';
import { GuildTextBasedChannel, VoiceBasedChannel } from 'discord.js';
import { promisify } from 'node:util';
import { BaseTrack } from './track';

const wait = promisify(setTimeout);

export class MusicQueue {
    private queue: BaseTrack[];
    private currentTrackIndex = -1;
    private voiceChannel: VoiceBasedChannel;
    private audioPlayer: AudioPlayer;
    private voiceConnection: VoiceConnection;
    private queueLock = false;
    private readyLock = false;
    private repeatTrack = false;
    private textChannel: GuildTextBasedChannel;
    private disconnectTimeout: NodeJS.Timeout | undefined;
    private destroyCallback: (() => void) | undefined;

    public constructor(voiceChannel: VoiceBasedChannel, textChannel: GuildTextBasedChannel) {
        this.queue = [];
        this.voiceChannel = voiceChannel;
        this.textChannel = textChannel;
        this.audioPlayer = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause, maxMissedFrames: Infinity } });
        const guild = this.voiceChannel.guild;
        this.voiceConnection = joinVoiceChannel({ channelId: this.voiceChannel.id, guildId: guild.id, adapterCreator: guild.voiceAdapterCreator });

        this.voiceConnection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
            try {
                await Promise.race([entersState(this.voiceConnection, VoiceConnectionStatus.Signalling, 5_000), entersState(this.voiceConnection, VoiceConnectionStatus.Connecting, 5_000)]);
            } catch (e) {
                this.voiceConnection.destroy();
            }
        });

        this.voiceConnection.on(VoiceConnectionStatus.Destroyed, async (oldState, newState) => {
            this.stop();
            if (this.destroyCallback) this.destroyCallback();
        });

        this.audioPlayer.on('error', async (error) => {
            console.log(`(MUSIC)[ERROR] Audioplayer error: ${error}`);
            if (this.queue[this.currentTrackIndex]) {
                return;
            }
            console.log(`(MUSIC)[INFO] Skipping track ${this.queue[this.currentTrackIndex].name} due error`);
            this.audioPlayer.stop(true);
            return;
        });

        this.audioPlayer.on(AudioPlayerStatus.Idle, (oldState, newState) => {
            if (oldState.status === AudioPlayerStatus.Playing) {
                console.log(`(MUSIC)[INFO] Played track ${this.queue[this.currentTrackIndex]?.name} in queue ${this.voiceChannel.id}, current queue length ${this.queue.length}`);
                this.disconnectTimeout = setTimeout(() => {
                    this.voiceConnection.disconnect();
                    if (this.destroyCallback) this.destroyCallback();
                }, Number(process.env.DISCONNECT_TIMEOUT) || 300_000);
                if (this.repeatTrack && this.queue[this.currentTrackIndex]) {
                    this.queue.unshift(this.queue[this.currentTrackIndex]);
                    console.log(`(MUSIC)[INFO] Replaying track ${this.queue[this.currentTrackIndex].name} in queue ${this.voiceChannel.id}`);
                }
                this.processQueue();
            }
        });

        this.voiceConnection.subscribe(this.audioPlayer);
    }

    public setDestroyCallback(destroyCallback: () => void): void {
        this.destroyCallback = destroyCallback;
    }

    public enqueue(track: BaseTrack) {
        this.queue.push(track);
        console.log(`(MUSIC)[INFO] Enqueued track ${track.name} to queue ${this.voiceChannel.id}, current queue length ${this.queue.length}`);
        this.processQueue();
    }

    public skipTrack(count = 1): number {
        if (this.currentTrackIndex + count > this.queue.length) {
            count = this.queue.length - this.currentTrackIndex;
        }
        this.currentTrackIndex += count - 1;
        this.audioPlayer.stop(true);
        return count;
    }

    public repeatCurrentTrack() {
        this.repeatTrack = true;
        console.log(`(MUSIC)[INFO] Track ${this.queue[this.currentTrackIndex]?.name || ''} will be repeated`);
    }

    public cancelRepeating() {
        this.repeatTrack = false;
        console.log(`(MUSIC)[INFO] Track ${this.queue[this.currentTrackIndex]?.name || ''} will be no more repeated`);
    }

    private async processQueue(): Promise<void> {
        if (this.queueLock || this.audioPlayer.state.status !== AudioPlayerStatus.Idle || this.queue.length === 0) {
            return;
        }
        console.log('(MUSIC)[INFO] Processing queue');

        if (!this.queue[this.currentTrackIndex + 1]) {
            console.log(`(MUSIC)[INFO] No next track, (${this.currentTrackIndex}/${this.queue.length - 1})`);
            return;
        }

        this.queueLock = true;
        this.currentTrackIndex++;
        try {
            this.textChannel.send(`Playing track ${this.queue[this.currentTrackIndex].name}`);
            const audioResource = await this.queue[this.currentTrackIndex].createAudioResource();
            this.audioPlayer.play(audioResource);
            clearTimeout(this.disconnectTimeout);
            this.queueLock = false;
        } catch (error: any) {
            console.log('(MUSIC)[ERROR] ' + error.message);
            this.queueLock = false;
            return this.processQueue();
        }
    }

    public stop() {
        this.queue = [];
        this.currentTrackIndex = -1;
        this.audioPlayer.stop(true);
    }

    public pause() {
        return this.audioPlayer.pause(true);
    }

    public unpause() {
        return this.audioPlayer.unpause();
    }

    public getTracksList() {
        if ((this.queue.length === 0 || this.currentTrackIndex >= this.queue.length - 1) && (!this.queue[this.currentTrackIndex] || !this.readyLock)) return 'No tracks enqueued';
        let list = '';
        if (this.queue[this.currentTrackIndex] && this.readyLock) list += `**Now playing:**\n${this.queue[this.currentTrackIndex].name}\n`;
        list += '**Queue:**\n';
        const slice = this.queue.slice(this.currentTrackIndex + 1);
        let counter = 0;
        for (const track of slice) {
            if (counter > 14) break;
            list += `${track.name};\n`;
            counter++;
        }

        if (slice.length - counter > 0) {
            list += `...(and ${slice.length - counter} more tracks)`;
        }
        return list;
    }

    public setTextChannel(textChannel: GuildTextBasedChannel) {
        this.textChannel = textChannel;
    }
}
