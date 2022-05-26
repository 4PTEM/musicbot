import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, entersState, joinVoiceChannel, VoiceConnection, VoiceConnectionDisconnectReason, VoiceConnectionState, VoiceConnectionStatus, demuxProbe, AudioResource } from '@discordjs/voice';
import { VoiceBasedChannel } from 'discord.js';
import { promisify } from 'node:util';
import ytdl from 'ytdl-core';
//import * as ytdl from 'youtube-dl-exec';
import * as fs from 'fs';
import * as stream from 'stream';


const wait = promisify(setTimeout);

class Track {
    link: string
    constructor(link: string) {
        this.link = link
    }

    createAudioResource(start: number = 0): AudioResource {
        const audioStream = ytdl(`https://www.youtube.com/watch?v=${this.link}`, {
            range: {
                start: Math.round(start / 1000)
            },
            quality: 'highestaudio',
            filter: 'audioonly'
        });
        return createAudioResource(audioStream);
    }
}

export class MusicQueue {
    tracks: string[];
    voiceChannel: VoiceBasedChannel;
    audioPlayer: AudioPlayer;
    voiceConnection: VoiceConnection;
    queueLock = false;
    readyLock = false;
    currentTrack: Track | undefined;

    constructor(voiceChannel: VoiceBasedChannel) {
        this.tracks = [];
        this.voiceChannel = voiceChannel;
        this.audioPlayer = createAudioPlayer();
        const guild = this.voiceChannel.guild;
        //@ts-ignore
        this.voiceConnection = joinVoiceChannel({ channelId: this.voiceChannel.id, guildId: guild.id, adapterCreator: guild.voiceAdapterCreator });

        this.voiceConnection.on(VoiceConnectionStatus.Signalling, async (_: VoiceConnectionState, newState: VoiceConnectionState) => {
            if (newState.status === VoiceConnectionStatus.Disconnected) {
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
            } else if (newState.status === VoiceConnectionStatus.Destroyed) {
                this.stop();
            } else if (
                !this.readyLock &&
                (newState.status === VoiceConnectionStatus.Connecting || newState.status === VoiceConnectionStatus.Signalling)
            ) {
                this.readyLock = true;
                try {
                    await entersState(this.voiceConnection, VoiceConnectionStatus.Ready, 20_000);
                } catch {
                    if (this.voiceConnection.state.status !== VoiceConnectionStatus.Destroyed) this.voiceConnection.destroy();
                } finally {
                    this.readyLock = false;
                }
            }
        });

        this.audioPlayer.on('error', (error) => {
            console.log(`(MUSIC)[ERROR] Audioplayer error: ${error}`);
            if (!this.currentTrack) return;
            console.log(`(MUSIC)[INFO] Tryng to replay track ${this.currentTrack.link}`);
            this.audioPlayer.play(this.currentTrack.createAudioResource(error.resource.playbackDuration));
        });

        this.audioPlayer.on(AudioPlayerStatus.Idle, (oldState, newState) => {
            if (oldState.status === AudioPlayerStatus.Playing && newState.status === AudioPlayerStatus.Idle) {
                console.log(`(MUSIC)[INFO]played track ${this.currentTrack?.link} in queue ${this.voiceChannel.id}, current queue length ${this.tracks.length}`)
                this.currentTrack = undefined;
                this.processQueue();
            }
        })

        this.voiceConnection.subscribe(this.audioPlayer);
    }

    public enqueue(track: string) {
        this.tracks.push(track);
        console.log(`(MUSIC)[INFO]enqueued track ${track} to queue ${this.voiceChannel.id}, current queue length ${this.tracks.length}`);
        this.processQueue();
    }

    private async processQueue(): Promise<void> {
        if (this.queueLock || this.audioPlayer.state.status !== AudioPlayerStatus.Idle || this.tracks.length === 0) {
            return;
        }
        this.queueLock = true;

        const nextTrackLink = this.tracks.shift()!;
        try {
            const track = new Track(nextTrackLink);
            this.currentTrack = track;
            const audioResource = track.createAudioResource();
            this.audioPlayer.play(audioResource);
            this.queueLock = false;
        } catch (error: any) {
            console.log('(MUSIC)[ERROR]\n' + error.message)
            this.queueLock = false;
            return this.processQueue();
        }
    }

    public stop() {
        this.queueLock = true;
        this.tracks = [];
        this.audioPlayer.stop(true);
    }
}