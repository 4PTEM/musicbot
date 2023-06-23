import { AudioResource, createAudioResource } from '@discordjs/voice';
import play from 'play-dl';
import { youTubeParser } from '../youtubeDataAPI/ytParser';

export interface BaseTrack {
    name?: string;
    link?: string;
    createAudioResource(start?: number): Promise<AudioResource>;
}
export class Track implements BaseTrack {
    public name: string;
    public link?: string;

    public constructor(name: string) {
        this.name = name;
    }

    public async createAudioResource(): Promise<AudioResource> {
        this.link = (await youTubeParser.searchVideo(this.name)).id.videoId;
        const { stream: audioStream, type } = await play.stream(this.link, { discordPlayerCompatibility: true });
        return createAudioResource(audioStream, { inputType: type });
    }
}

export class YoutubeTrack {
    public name?: string;
    public link: string;

    public constructor(link: string, name: string) {
        this.link = link;
        this.name = name;
    }

    public async createAudioResource(): Promise<AudioResource> {
        const { stream: audioStream, type } = await play.stream(this.link, { discordPlayerCompatibility: true });
        return createAudioResource(audioStream, { inputType: type });
    }
}
