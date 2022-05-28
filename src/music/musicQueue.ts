import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, entersState, joinVoiceChannel, VoiceConnection, VoiceConnectionDisconnectReason, VoiceConnectionState, VoiceConnectionStatus, demuxProbe, AudioResource } from '@discordjs/voice';
import { VoiceBasedChannel } from 'discord.js';
import { promisify } from 'node:util';
import ytdl from 'ytdl-core';
import fetch from 'node-fetch';

const wait = promisify(setTimeout);

const API_KEYS = process.env.API_KEYS?.split(' ');
let CURRENT_KEY_INDEX = -1;
refreshApiKey();
function refreshApiKey() {
    if (!API_KEYS) {
        console.log('(API KEYS)[ERROR] No api keys provided');
        return;
    }
    CURRENT_KEY_INDEX = (CURRENT_KEY_INDEX + 1);
    if (CURRENT_KEY_INDEX >= API_KEYS.length) {
        throw new Error('All API keys exceeded');
    }
    console.log(`(API KEYS)[INFO] Refreshed API keys old API_KEY: ${process.env.API_KEY}; new API_KEY: ${API_KEYS[CURRENT_KEY_INDEX]}`);
    process.env.API_KEY = API_KEYS[CURRENT_KEY_INDEX];
}

export interface BaseTrack {
    name: string;
    triedToReplay: boolean;
    createAudioResource(start?: number): Promise<AudioResource>;
}

export class Track implements BaseTrack {
    name: string;
    triedToReplay = false;

    constructor(name: string) {
        this.name = name;
    }

    public async createAudioResource(start = 0): Promise<AudioResource> {
        const queryParams = `part=id&maxResults=1&q=${encodeURI(this.name)}`;
        let youtubeSearchResult = await (await fetch(`https://www.googleapis.com/youtube/v3/search?${queryParams}&key=${process.env.API_KEY}`)).json();
        while (youtubeSearchResult?.error?.code === 403) {
            refreshApiKey();
            youtubeSearchResult = await (await fetch(`https://www.googleapis.com/youtube/v3/search?${queryParams}&key=${process.env.API_KEY}`)).json();
        }
        const videoId = youtubeSearchResult?.items[0]?.id?.videoId;
        const audioStream = ytdl(`https://www.youtube.com/watch?v=${videoId}`, {
            range: {
                start: Math.round(start / 1000)
            },
            quality: 'highestaudio',
            filter: 'audioonly'
        });
        return createAudioResource(audioStream);
    }
}

export class YoutubeTrack {
    name: string;
    triedToReplay = false;

    constructor(name: string) {
        this.name = name;
    }

    public async createAudioResource(start = 0): Promise<AudioResource> {
        const audioStream = ytdl(this.name, {
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
    tracks: BaseTrack[];
    voiceChannel: VoiceBasedChannel;
    audioPlayer: AudioPlayer;
    voiceConnection: VoiceConnection;
    queueLock = false;
    readyLock = false;
    currentTrack: BaseTrack | undefined;

    constructor(voiceChannel: VoiceBasedChannel) {
        this.tracks = [];
        this.voiceChannel = voiceChannel;
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

        this.audioPlayer.on('error', async (error) => {
            console.log(`(MUSIC)[ERROR] Audioplayer error: ${error}`);
            if (!this.currentTrack || this.currentTrack.triedToReplay) return;
            console.log(`(MUSIC)[INFO] Tryng to replay track ${this.currentTrack.name}`);
            this.audioPlayer.play(await this.currentTrack.createAudioResource(error.resource.playbackDuration));
            this.currentTrack.triedToReplay = true;
        });

        this.audioPlayer.on(AudioPlayerStatus.Idle, (oldState, newState) => {
            if (oldState.status === AudioPlayerStatus.Playing) {
                console.log(`(MUSIC)[INFO] Played track ${this.currentTrack?.name} in queue ${this.voiceChannel.id}, current queue length ${this.tracks.length}`);
                this.currentTrack = undefined;
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
            if(this.tracks.length == 0) break;
            this.currentTrack = this.tracks.shift()!;
            console.log(`(MUSIC)[INFO] Skipped ${this.currentTrack.name} tracks in queue ${this.voiceChannel.id}, current queue length ${this.tracks.length}`);
        }
        this.processQueue();
    }

    private async processQueue(): Promise<void> {
        if (this.queueLock || this.audioPlayer.state.status !== AudioPlayerStatus.Idle || this.tracks.length === 0) {
            return;
        }
        this.queueLock = true;

        const track = this.tracks.shift()!;
        try {
            this.currentTrack = track;
            const audioResource = await track.createAudioResource();
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
}