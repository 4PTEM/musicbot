import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, entersState, joinVoiceChannel, VoiceConnection, VoiceConnectionDisconnectReason, VoiceConnectionStatus } from '@discordjs/voice';
import { GuildTextBasedChannel, VoiceBasedChannel } from 'discord.js';
import { promisify } from 'node:util';
import { BaseTrack } from './track';

const wait = promisify(setTimeout);

export class MusicQueue {
    private tracks: BaseTrack[];
    private voiceChannel: VoiceBasedChannel;
    private audioPlayer: AudioPlayer;
    private voiceConnection: VoiceConnection;
    private queueLock = false;
    private readyLock = false;
    private repeatTrack = false;
    private currentTrack: BaseTrack | undefined;
    private textChannel: GuildTextBasedChannel;

    constructor(voiceChannel: VoiceBasedChannel, textChannel: GuildTextBasedChannel) {
        this.tracks = [];
        this.voiceChannel = voiceChannel;
        this.textChannel = textChannel;
        this.audioPlayer = createAudioPlayer();
        const guild = this.voiceChannel.guild;
        //@ts-ignore
        this.voiceConnection = joinVoiceChannel({ channelId: this.voiceChannel.id, guildId: guild.id, adapterCreator: guild.voiceAdapterCreator });

        this.voiceConnection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
            if (newState.reason === VoiceConnectionDisconnectReason.WebSocketClose && newState.closeCode === 4014) {
                try {
                    await entersState(this.voiceConnection, VoiceConnectionStatus.Connecting, 5_000);
                } catch {
                    this.voiceConnection.destroy();
                }
            } else if (this.voiceConnection.rejoinAttempts < 5) {
                await wait((this.voiceConnection.rejoinAttempts + 1) * 5_000);
                this.voiceConnection.rejoin();
            } else {
                this.voiceConnection.destroy();
            }
        });

        this.voiceConnection.on(VoiceConnectionStatus.Destroyed, async (oldState, newState) => {
            this.stop();
        });

        this.voiceConnection.on(VoiceConnectionStatus.Connecting, async (oldState, newState) => {
            if (!this.readyLock) {
                this.readyLock = true;
                try {
                    await entersState(this.voiceConnection, VoiceConnectionStatus.Ready, 20_000);
                } catch (error: any) {
                    if (this.voiceConnection.state.status !== VoiceConnectionStatus.Destroyed) this.voiceConnection.destroy();
                } finally {
                    this.readyLock = false;
                }
            }
        });

        this.voiceConnection.on(VoiceConnectionStatus.Signalling, async (oldState, newState) => {
            if (!this.readyLock) {
                this.readyLock = true;
                try {
                    await entersState(this.voiceConnection, VoiceConnectionStatus.Ready, 20_000);
                } catch (error: any) {
                    if (this.voiceConnection.state.status !== VoiceConnectionStatus.Destroyed) this.voiceConnection.destroy();
                } finally {
                    this.readyLock = false;
                }
            }
        });

        this.audioPlayer.on('error', async (error) => {
            console.log(`(MUSIC)[ERROR] Audioplayer error: ${error}`);
            this.audioPlayer.stop(true);
            if (!this.currentTrack) {
                return;
            } else if (this.currentTrack.triedToReplay) {
                console.log(`(MUSIC)[INFO] Skipping track ${this.currentTrack.name}`);
                this.audioPlayer.stop(true);
                this.processQueue();
                return;
            }
            console.log(`(MUSIC)[INFO] Tryng to replay track ${this.currentTrack.name}`);
            this.audioPlayer.play(await this.currentTrack.createAudioResource(error.resource.playbackDuration));
            this.currentTrack.triedToReplay = true;
        });

        this.audioPlayer.on(AudioPlayerStatus.Idle, (oldState, newState) => {
            if (oldState.status === AudioPlayerStatus.Playing) {
                console.log(`(MUSIC)[INFO] Played track ${this.currentTrack?.name} in queue ${this.voiceChannel.id}, current queue length ${this.tracks.length}`);
                if (this.repeatTrack && this.currentTrack) {
                    this.tracks.unshift(this.currentTrack);
                    console.log(`(MUSIC)[INFO] Replaying track ${this.currentTrack.name} in queue ${this.voiceChannel.id}`);
                }
                this.processQueue();
            }
        });

        this.voiceConnection.subscribe(this.audioPlayer);
    }

    public enqueue(track: BaseTrack) {
        this.tracks.push(track);
        console.log(`(MUSIC)[INFO] Enqueued track ${track.name} to queue ${this.voiceChannel.id}, current queue length ${this.tracks.length}`);
        this.processQueue();
    }

    public skipTrack(count = 1) {
        this.audioPlayer.stop();
        for (let i = 0; i < count - 1; i++) {
            if (this.tracks.length === 0) break;
            this.currentTrack = this.tracks.shift()!;
            console.log(`(MUSIC)[INFO] Skipped ${this.currentTrack.name} tracks in queue ${this.voiceChannel.id}, current queue length ${this.tracks.length}`);
        }
        this.processQueue();
    }

    public repeatCurrentTrack() {
        this.repeatTrack = true;
        console.log(`(MUSIC)[INFO] Track ${this.currentTrack?.name || ''} will be repeated`);
    }

    public cancelRepeating() {
        this.repeatTrack = false;
        console.log(`(MUSIC)[INFO] Track ${this.currentTrack?.name || ''} will be no more repeated`);
    }

    private async processQueue(): Promise<void> {
        if (this.queueLock || this.audioPlayer.state.status !== AudioPlayerStatus.Idle || this.tracks.length === 0) {
            return;
        }
        this.queueLock = true;

        this.currentTrack = this.tracks.shift()!;
        try {
            const audioResource = await this.currentTrack.createAudioResource();
            this.textChannel.send(`Playing track ${this.currentTrack.name}`)
            this.audioPlayer.play(audioResource);
            this.queueLock = false;
        } catch (error: any) {
            console.log('(MUSIC)[ERROR] ' + error.message);
            this.queueLock = false;
            return this.processQueue();
        }
    }

    public stop() {
        this.tracks = [];
        this.audioPlayer.stop(true);
    }

    public setTextChannel(textChannel: GuildTextBasedChannel) {
        this.textChannel = textChannel;
    }
}
