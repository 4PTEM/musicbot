import { AudioResource, createAudioResource } from '@discordjs/voice';
import ytdl from 'ytdl-core';
import { youTubeParser } from '../youtubeDataAPI/ytParser';

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
        const videoId = (await youTubeParser.searchVideo(this.name)).id.videoId;
        const audioStream = ytdl(`https://www.youtube.com/watch?v=${videoId}`, {
            range: {
                start: Math.round(start / 1000),
            },
            quality: 'highestaudio',
            filter: 'audioonly',
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
                start: Math.round(start / 1000),
            },
            quality: 'highestaudio',
            filter: 'audioonly',
        });
        return createAudioResource(audioStream);
    }
}
