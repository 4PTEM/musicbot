import { AudioResource, createAudioResource } from '@discordjs/voice';
import ytdl from 'ytdl-core';
import { youTubeParser } from '../youtubeDataAPI/ytParser';

export interface BaseTrack {
    name?: string;
    link?: string;
    triedToReplay: boolean;
    createAudioResource(start?: number): Promise<AudioResource>;
}

export class Track implements BaseTrack {
    public name: string;
    public link?: string;
    public triedToReplay = false;

    public constructor(name: string) {
        this.name = name;
    }

    public async createAudioResource(): Promise<AudioResource> {
        this.link = (await youTubeParser.searchVideo(this.name)).id.videoId;
        const audioStream = ytdl(this.link, {
            quality: 'highestaudio',
            filter: 'audioonly',
        });
        return createAudioResource(audioStream);
    }
}

export class YoutubeTrack {
    public name?: string;
    public link: string;
    public triedToReplay = false;

    public constructor(link: string, name: string) {
        this.link = link;
        this.name = name
    }

    public async createAudioResource(): Promise<AudioResource> {
        const audioStream = ytdl(this.link, {
            quality: 'highestaudio',
            filter: 'audioonly',
        });
        return createAudioResource(audioStream);
    }
}
